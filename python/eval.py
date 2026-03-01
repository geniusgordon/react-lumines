"""
eval.py — Evaluate a trained Lumines DQN checkpoint.

Usage:
    # Basic evaluation (10 episodes, report mean/max/min score)
    python python/eval.py

    # Specific checkpoint
    python python/eval.py --checkpoint python/checkpoints/final.zip --episodes 20

    # ASCII render (watch agent play)
    python python/eval.py --checkpoint python/checkpoints/final.zip --render --episodes 3

    # Control render speed
    python python/eval.py --render --delay 0.05

    # Step through one episode manually (Space/Enter=next, r=run, q=quit)
    python python/eval.py --step --episodes 1

    # Use Node.js IPC env instead of pure Python env
    python python/eval.py --no-native
"""

import argparse
import copy
import os
import select
import sys
import termios
import time
import tty

import numpy as np
sys.path.insert(0, os.path.dirname(__file__))


def _getch():
    """Read a single keypress from stdin without requiring Enter.
    Arrow keys are returned as 'LEFT' or 'RIGHT'.
    Uses os.read() to bypass Python's buffered IO so select() sees the right state.
    """
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = os.read(fd, 1)
        if ch == b"\x1b":
            # Could be an arrow key escape sequence (\x1b [ D / C)
            rlist, _, _ = select.select([fd], [], [], 0.05)
            if rlist:
                ch2 = os.read(fd, 1)
                if ch2 == b"[":
                    rlist2, _, _ = select.select([fd], [], [], 0.05)
                    if rlist2:
                        ch3 = os.read(fd, 1)
                        if ch3 == b"D":
                            return "LEFT"
                        elif ch3 == b"C":
                            return "RIGHT"
        decoded = ch.decode("utf-8", errors="replace")
        if decoded == "\x03":
            raise KeyboardInterrupt
        return decoded
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


from lumines_env import LuminesEnv
from game.env import LuminesEnvNative

from stable_baselines3 import DQN, PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def _normalize_obs(vec_normalize, obs):
    """Normalize a single (unbatched) obs dict through a VecNormalize wrapper."""
    batched = {k: np.array([v]) for k, v in obs.items()} if isinstance(obs, dict) else np.array([obs])
    return vec_normalize.normalize_obs(batched)


def evaluate(args):
    if args.step:
        args.render = True

    if args.save_replay:
        args.native = False  # force TypeScript env for browser compatibility
        args.episodes = 1    # only record one episode

    print(f"Loading checkpoint: {args.checkpoint}")
    vec_normalize = None
    if args.algo == "ppo":
        norm_stats_path = os.path.join(os.path.dirname(args.checkpoint), "vecnormalize.pkl")
        _dummy_env = DummyVecEnv([lambda: (LuminesEnvNative(mode="per_block") if args.native else LuminesEnv(mode="per_block"))])
        if os.path.exists(norm_stats_path):
            print(f"Loading VecNormalize stats from {norm_stats_path}")
            _dummy_env = VecNormalize.load(norm_stats_path, _dummy_env)
            _dummy_env.training = False
            _dummy_env.norm_reward = False
            vec_normalize = _dummy_env
        model = PPO.load(args.checkpoint, env=_dummy_env, device=args.device)
    else:
        model = DQN.load(args.checkpoint, device=args.device)

    render_mode = "ansi" if args.render else None
    scores = []

    # Diagnostic accumulators (across all episodes)
    all_holding_scores: list[float] = []
    all_score_deltas: list[float] = []
    all_target_xs: list[int] = []

    for episode in range(1, args.episodes + 1):
        if args.native:
            env = LuminesEnvNative(mode="per_block", render_mode=render_mode)
        else:
            record_path = args.save_replay if (args.save_replay and episode == 1) else None
            env = LuminesEnv(mode="per_block", render_mode=render_mode, record_replay_path=record_path)
        seed = episode
        obs, _ = env.reset(seed=seed)
        done = False
        episode_score = 0
        action_history = []
        running = False       # step mode: False=paused, True=auto-running
        snapshot_stack = []   # stack of snapshots for multi-level undo
        last_action_desc = ""
        last_info: dict = {}
        ep_holding_scores: list[float] = []
        ep_score_deltas: list[float] = []

        print(f"\n=== Episode {episode}/{args.episodes} (seed={seed}) ===")

        while not done:
            # Save snapshot before stepping (native env only)
            if hasattr(env, '_state'):
                snapshot_stack.append((
                    copy.deepcopy(env._state),
                    env._blocks_placed,
                    {k: v.copy() for k, v in obs.items()} if isinstance(obs, dict) else obs.copy(),
                    episode_score,
                    action_history[:],
                    last_action_desc,
                    last_info,
                ))

            predict_obs = _normalize_obs(vec_normalize, obs) if vec_normalize is not None else obs
            action, _ = model.predict(predict_obs, deterministic=args.deterministic)
            action_int = int(action.flat[0])
            # Describe the action for debugging
            if env.mode == "per_block":
                target_x = action_int // 4
                rotation = action_int % 4
                action_desc = f"action={action_int} (col={target_x}, rot={rotation})"
                action_history.append((target_x, rotation))
            else:
                from game.env import FRAME_ACTIONS
                action_desc = f"action={action_int} ({FRAME_ACTIONS[action_int]})"
                action_history.append(action_desc)
            obs, reward, terminated, truncated, info = env.step(action_int)
            episode_score += reward
            done = terminated or truncated
            last_action_desc = action_desc
            last_info = info

            # Diagnostics
            if env.mode == "per_block":
                all_target_xs.append(target_x)
                rc = info.get("reward_components", {})
                ep_score_deltas.append(rc.get("score_delta", 0.0))
                if isinstance(obs, dict) and "holding_score" in obs:
                    # holding_score is normalised to [0,1] by /10 in env; recover raw value
                    ep_holding_scores.append(float(obs["holding_score"].flat[0]) * 10.0)

            if args.render:
                frame = env.render()
                if frame:
                    # Clear previous render and print new one
                    print("\033[2J\033[H", end="")  # ANSI clear screen
                    print(f"Episode {episode} (seed={seed}) | Cumulative reward: {episode_score:.3f} | {action_desc}")
                    rc = info.get("reward_components")
                    board_lines = frame.split("\n")
                    rc_lines = [f"{k}: {v:+.3f}" for k, v in rc.items()] if rc else []
                    board_w = 24  # pad past board width (20) for a visual gap
                    n = max(len(board_lines), len(rc_lines))
                    for i in range(n):
                        bl = board_lines[i] if i < len(board_lines) else ""
                        rl = rc_lines[i] if i < len(rc_lines) else ""
                        print(f"{bl:<{board_w}}{rl}")
                    recent = action_history[-20:]
                    if env.mode == "per_block" and recent:
                        cols = "".join(f"{c:4d}" for c, _ in recent)
                        rots = "".join(f"{r:4d}" for _, r in recent)
                        print(f"  History ({len(action_history)}):")
                        print(f"    col{cols}")
                        print(f"    rot{rots}")
                    else:
                        print(f"  History ({len(action_history)}): {', '.join(str(a) for a in recent)}")
                    if args.delay > 0 and not args.step:
                        time.sleep(args.delay)

            if args.step:
                undo_requested = False
                while True:  # inner loop: re-enters after undo to show updated hint
                    can_undo = bool(snapshot_stack)
                    mode_hint = "[r=run]" if not running else "[r=pause]"
                    back_hint = f"  ←: back ({len(snapshot_stack)})" if can_undo else ""
                    print(f"  →/Space: next{back_hint}  {mode_hint}  q: quit", end="", flush=True)
                    if not running:
                        ch = _getch()
                        if ch in ("RIGHT", " ", "\r", "\n"):
                            print()
                            break
                        elif ch in ("r", "R"):
                            running = True
                            print(f"\n  [running — press r to pause]", flush=True)
                            break
                        elif ch in ("q", "Q"):
                            print("\n  [quit episode]")
                            done = True
                            break
                        elif ch == "LEFT" and can_undo:
                            s_state, s_blocks, s_obs, s_score, s_hist, s_action_desc, s_info = snapshot_stack.pop()
                            env._state = s_state
                            env._blocks_placed = s_blocks
                            obs = s_obs
                            episode_score = s_score
                            action_history = s_hist
                            last_action_desc = s_action_desc
                            last_info = s_info
                            done = False
                            undo_requested = True
                            # Full re-render of the restored state
                            frame = env.render()
                            if frame:
                                print("\033[2J\033[H", end="")
                                print(f"Episode {episode} (seed={seed}) | Cumulative reward: {episode_score:.3f} | {s_action_desc} [undo]")
                                rc = s_info.get("reward_components")
                                board_lines = frame.split("\n")
                                rc_lines = [f"{k}: {v:+.3f}" for k, v in rc.items()] if rc else []
                                board_w = 24
                                n = max(len(board_lines), len(rc_lines))
                                for i in range(n):
                                    bl = board_lines[i] if i < len(board_lines) else ""
                                    rl = rc_lines[i] if i < len(rc_lines) else ""
                                    print(f"{bl:<{board_w}}{rl}")
                                recent = action_history[-20:]
                                if env.mode == "per_block" and recent:
                                    cols = "".join(f"{c:4d}" for c, _ in recent)
                                    rots = "".join(f"{r:4d}" for _, r in recent)
                                    print(f"  History ({len(action_history)}):")
                                    print(f"    col{cols}")
                                    print(f"    rot{rots}")
                                else:
                                    print(f"  History ({len(action_history)}): {', '.join(str(a) for a in recent)}")
                            continue  # re-show hint for restored state
                    else:
                        # Run mode: non-blocking check for 'r' to re-pause
                        fd = sys.stdin.fileno()
                        old = termios.tcgetattr(fd)
                        try:
                            tty.setraw(fd)
                            rlist, _, _ = select.select([fd], [], [], 0)
                            if rlist:
                                ch = os.read(fd, 1).decode("utf-8", errors="replace")
                                if ch == "\x03":
                                    raise KeyboardInterrupt
                                elif ch in ("r", "R"):
                                    running = False
                        finally:
                            termios.tcsetattr(fd, termios.TCSADRAIN, old)
                        print()
                        if args.delay > 0:
                            time.sleep(args.delay)
                        break
                if undo_requested:
                    continue  # outer: re-predict and re-execute from restored state

        # Final score from info (raw game score, not cumulative reward)
        final_score = info.get("finalScore", episode_score)
        scores.append(final_score)
        all_holding_scores.extend(ep_holding_scores)
        all_score_deltas.extend(ep_score_deltas)

        ep_diag = ""
        if ep_holding_scores:
            ep_diag += f"  holding_score mean={np.mean(ep_holding_scores):.2f} max={np.max(ep_holding_scores):.2f}"
        nonzero_deltas = [d for d in ep_score_deltas if d > 0]
        if nonzero_deltas:
            ep_diag += f"  score_delta(nonzero) n={len(nonzero_deltas)} mean={np.mean(nonzero_deltas):.2f} max={np.max(nonzero_deltas):.2f}"
        print(f"Episode {episode} finished — score: {final_score:.0f}{ep_diag}")
        env.close()

    # Summary
    print("\n" + "=" * 40)
    print(f"Episodes:  {args.episodes}")
    print(f"Mean score: {sum(scores) / len(scores):.1f}")
    print(f"Max score:  {max(scores):.1f}")
    print(f"Min score:  {min(scores):.1f}")

    # Diagnostics summary
    if all_holding_scores:
        print(f"\n--- Diagnostics ---")
        print(f"holding_score  mean={np.mean(all_holding_scores):.3f}  "
              f"max={np.max(all_holding_scores):.1f}  "
              f"(>3: {sum(1 for h in all_holding_scores if h > 3)} / {len(all_holding_scores)} steps)")

    if all_score_deltas:
        nonzero = [d for d in all_score_deltas if d > 0]
        print(f"score_delta    steps={len(all_score_deltas)}  "
              f"nonzero={len(nonzero)} ({100*len(nonzero)/len(all_score_deltas):.1f}%)  "
              + (f"mean={np.mean(nonzero):.2f}  max={np.max(nonzero):.2f}" if nonzero else "no score events"))

    if all_target_xs:
        col_counts = np.bincount(all_target_xs, minlength=15)
        total_placements = len(all_target_xs)
        center_frac = sum(col_counts[6:10]) / total_placements * 100
        top3 = sorted(range(15), key=lambda c: col_counts[c], reverse=True)[:3]
        top3_str = ", ".join(f"col{c}={col_counts[c]/total_placements*100:.1f}%" for c in top3)
        print(f"column dist    center(6-9)={center_frac:.1f}%  top3: {top3_str}")
        col_bar = "  " + "".join(f"{c:3d}" for c in range(15))
        col_pct = "  " + "".join(f"{col_counts[c]/total_placements*100:3.0f}" for c in range(15))
        print(f"  cols: {col_bar}")
        print(f"  pct%: {col_pct}")

    print("=" * 40)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate a Lumines DQN checkpoint")
    parser.add_argument(
        "--checkpoint",
        default="python/checkpoints/best_model",
        help="Path to saved DQN model (.zip)",
    )
    parser.add_argument("--episodes", type=int, default=10)
    parser.add_argument("--device", type=str, default="cpu",
                        help="Inference device (cpu recommended for eval)")
    parser.add_argument("--render", action="store_true",
                        help="Render ASCII board after each step")
    parser.add_argument("--delay", type=float, default=0.1,
                        help="Seconds to sleep between rendered steps (0 to disable)")
    parser.add_argument(
        "--no-native",
        dest="native",
        action="store_false",
        help="Use Node.js IPC subprocess env instead of pure Python env",
    )
    parser.set_defaults(native=True)
    parser.add_argument(
        "--algo",
        choices=["dqn", "ppo"],
        default="ppo",
        help="Algorithm of the checkpoint to load (default: ppo)",
    )
    parser.add_argument(
        "--no-deterministic",
        dest="deterministic",
        action="store_false",
        help="Use stochastic (sampled) actions instead of argmax",
    )
    parser.set_defaults(deterministic=True)
    parser.add_argument(
        "--step",
        action="store_true",
        help="Pause after each rendered step and wait for keypress (Space/Enter=next, r=run, q=quit)",
    )
    parser.add_argument(
        "--save-replay",
        dest="save_replay",
        default=None,
        metavar="PATH",
        help="Save the first episode as a browser-compatible replay JSON (forces --no-native)",
    )
    args = parser.parse_args()

    evaluate(args)
