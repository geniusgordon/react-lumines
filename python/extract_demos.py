"""
extract_demos.py — Convert recorded demo JSONs into a numpy (obs, action) dataset.

Usage:
    python python/extract_demos.py                         # process python/demos/*.json
    python python/extract_demos.py --demos-dir my_demos    # custom input dir
    python python/extract_demos.py --output dataset.npz    # custom output path

Output: numpy .npz file with keys matching the observation space keys, plus 'actions'.
Each row i corresponds to one (obs, action) pair from a human demo.
"""

import argparse
import glob
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from game.env import LuminesEnvNative


def replay_demo(demo_path: str) -> list[tuple[dict, int]]:
    """Replay a demo JSON and return list of (obs, action) pairs.

    Stops when the game ends or all recorded actions are exhausted.
    """
    with open(demo_path) as f:
        data = json.load(f)

    seed = data["seed"]
    actions = data["actions"]  # list of [col, rot]

    env = LuminesEnvNative(mode="per_block", seed=seed)
    obs, _ = env.reset(seed=int(seed) if seed.isdigit() else None)

    pairs = []
    for col, rot in actions:
        action_int = col * 4 + rot
        pairs.append((obs, action_int))
        obs, _, done, _, _ = env.step(action_int)
        if done:
            break

    env.close()
    return pairs


def build_dataset(demos_dir: str, output_path: str) -> None:
    """Process all JSON demos in demos_dir and save a numpy dataset."""
    demo_files = sorted(glob.glob(os.path.join(demos_dir, "*.json")))
    if not demo_files:
        print(f"No demo files found in {demos_dir}")
        return

    all_pairs = []
    for path in demo_files:
        print(f"  Replaying {os.path.basename(path)} ...", end=" ", flush=True)
        try:
            pairs = replay_demo(path)
            all_pairs.extend(pairs)
            print(f"{len(pairs)} steps")
        except Exception as e:
            print(f"SKIP ({e})")

    if not all_pairs:
        print("No pairs collected.")
        return

    # Stack observations key-by-key
    obs_keys = list(all_pairs[0][0].keys())
    stacked_obs = {
        k: np.array([pair[0][k] for pair in all_pairs]) for k in obs_keys
    }
    actions = np.array([pair[1] for pair in all_pairs], dtype=np.int32)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    np.savez_compressed(output_path, actions=actions, **stacked_obs)
    print(f"\nSaved {len(all_pairs)} (obs, action) pairs → {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert demo JSONs to numpy dataset")
    parser.add_argument("--demos-dir", dest="demos_dir", default="python/demos")
    parser.add_argument(
        "--output",
        default=None,
        help="Output .npz path (default: <demos-dir>/dataset.npz)",
    )
    args = parser.parse_args()
    output = args.output or os.path.join(args.demos_dir, "dataset.npz")
    build_dataset(demos_dir=args.demos_dir, output_path=output)
