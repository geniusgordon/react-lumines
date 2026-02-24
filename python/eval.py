"""
eval.py — Evaluate a trained Lumines PPO checkpoint.

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

import sys
sys.path.insert(0, os.path.dirname(__file__))
from lumines_env import LuminesEnv
from game.env import LuminesEnvNative

from stable_baselines3 import PPO


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate(args):
    print(f"Loading checkpoint: {args.checkpoint}")
    model = PPO.load(args.checkpoint, device=args.device)

    render_mode = "ansi" if args.render else None
    scores = []

    for episode in range(1, args.episodes + 1):
        if args.native:
            env = LuminesEnvNative(mode="per_block", render_mode=render_mode)
        else:
            env = LuminesEnv(mode="per_block", render_mode=render_mode)
        obs, _ = env.reset(seed=episode)
        done = False
        episode_score = 0

        print(f"\n=== Episode {episode}/{args.episodes} ===")

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(int(action))
            episode_score += reward
            done = terminated or truncated

            if args.render:
                frame = env.render()
                if frame:
                    # Clear previous render and print new one
                    print("\033[2J\033[H", end="")  # ANSI clear screen
                    print(f"Episode {episode} | Cumulative reward: {episode_score:.3f}")
                    print(frame)
                    rc = info.get("reward_components")
                    if rc:
                        parts = "  ".join(f"{k}: {v:+.3f}" for k, v in rc.items())
                        print(f"  Reward: {parts}")
                    if args.delay > 0:
                        time.sleep(args.delay)

        # Final score from info (raw game score, not cumulative reward)
        final_score = info.get("score", episode_score)
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
    parser = argparse.ArgumentParser(description="Evaluate a Lumines PPO checkpoint")
    parser.add_argument(
        "--checkpoint",
        default="python/checkpoints/best_model",
        help="Path to saved PPO model (.zip)",
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
    args = parser.parse_args()

    evaluate(args)
