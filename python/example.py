"""
example.py — Smoke test + usage demo for the Lumines gymnasium env.

Run:
    cd /path/to/react-lumines
    pip install -r python/requirements.txt
    python python/example.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from lumines_env import LuminesEnv


def main():
    print("=== Smoke test: per_block mode ===")
    env = LuminesEnv(mode="per_block", seed="example-seed")
    obs, info = env.reset()

    print(f"board shape:         {len(obs['board'])}×{len(obs['board'][0])}")
    print(f"current_block shape: {obs['current_block'].shape}")
    print(f"queue shape:         {obs['queue'].shape}")
    print()

    total_reward = 0.0
    for i in range(10):
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        print(f"step {i+1:2d}  action={action:2d}  reward={reward:.0f}  "
              f"score={obs['score'][0]}  done={terminated}")
        if terminated:
            break

    print(f"\nTotal reward: {total_reward}")
    env.close()

    print("\n=== Determinism check ===")
    env1 = LuminesEnv(mode="per_block", seed="det-check")
    env2 = LuminesEnv(mode="per_block", seed="det-check")

    env1.reset(seed=42)
    env2.reset(seed=42)

    actions = [28, 7, 52, 3, 14]
    scores1, scores2 = [], []
    for a in actions:
        o1, r1, d1, _, i1 = env1.step(a)
        o2, r2, d2, _, i2 = env2.step(a)
        scores1.append(int(o1["score"][0]))
        scores2.append(int(o2["score"][0]))

    env1.close()
    env2.close()

    print(f"Env1 scores: {scores1}")
    print(f"Env2 scores: {scores2}")
    assert scores1 == scores2, "FAIL: scores differ!"
    print("PASS: determinism confirmed")


if __name__ == "__main__":
    main()
