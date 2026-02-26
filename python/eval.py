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

    # Use Node.js IPC env instead of pure Python env
    python python/eval.py --no-native
"""

import argparse
import os
import time

import numpy as np
import sys
sys.path.insert(0, os.path.dirname(__file__))
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

    for episode in range(1, args.episodes + 1):
        if args.native:
            env = LuminesEnvNative(mode="per_block", render_mode=render_mode)
        else:
            env = LuminesEnv(mode="per_block", render_mode=render_mode)
        seed = episode
        obs, _ = env.reset(seed=seed)
        done = False
        episode_score = 0
        action_history = []

        print(f"\n=== Episode {episode}/{args.episodes} (seed={seed}) ===")

        while not done:
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

            if args.render:
                frame = env.render()
                if frame:
                    # Clear previous render and print new one
                    print("\033[2J\033[H", end="")  # ANSI clear screen
                    print(f"Episode {episode} (seed={seed}) | Cumulative reward: {episode_score:.3f} | {action_desc}")
                    print(frame)
                    rc = info.get("reward_components")
                    if rc:
                        parts = "  ".join(f"{k}: {v:+.3f}" for k, v in rc.items())
                        print(f"  Reward: {parts}")
                    recent = action_history[-20:]
                    if env.mode == "per_block" and recent:
                        cols = "".join(f"{c:4d}" for c, _ in recent)
                        rots = "".join(f"{r:4d}" for _, r in recent)
                        print(f"  History ({len(action_history)}):")
                        print(f"    col{cols}")
                        print(f"    rot{rots}")
                    else:
                        print(f"  History ({len(action_history)}): {', '.join(str(a) for a in recent)}")
                    if args.delay > 0:
                        time.sleep(args.delay)

        # Final score from info (raw game score, not cumulative reward)
        final_score = info.get("finalScore", episode_score)
        scores.append(final_score)
        print(f"Episode {episode} finished — score: {final_score:.0f}")
        env.close()

    # Summary
    print("\n" + "=" * 40)
    print(f"Episodes:  {args.episodes}")
    print(f"Mean score: {sum(scores) / len(scores):.1f}")
    print(f"Max score:  {max(scores):.1f}")
    print(f"Min score:  {min(scores):.1f}")
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
    args = parser.parse_args()

    evaluate(args)
