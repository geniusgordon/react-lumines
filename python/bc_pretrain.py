"""
bc_pretrain.py — Behavioral Cloning (BC) pretraining from human demo dataset.

Loads the numpy dataset produced by extract_demos.py and trains a PPO or DQN
policy via supervised learning (cross-entropy / negative log-likelihood) before
RL fine-tuning begins. This warm-starts the policy with meaningful behavior so
RL can build on it rather than exploring from scratch.

Workflow:
    1. python python/play.py --seed 42          # record demos → python/demos/*.json
    2. python python/extract_demos.py           # build dataset → python/demos/dataset.npz
    3. python python/bc_pretrain.py             # BC pretrain → python/checkpoints/bc_pretrained_ppo
    4. python python/train.py --resume python/checkpoints/bc_pretrained_ppo  # RL fine-tune

Usage:
    python python/bc_pretrain.py
    python python/bc_pretrain.py --algo dqn --steps 20000
    python python/bc_pretrain.py --dataset python/demos/dataset.npz --steps 100  # smoke test
"""

import argparse
import os
import sys

import numpy as np
import torch
import torch.nn.functional as F
from stable_baselines3 import DQN, PPO
from stable_baselines3.common.vec_env import DummyVecEnv

# Import shared components from train.py
sys.path.insert(0, os.path.dirname(__file__))
from train import LuminesCNNExtractor, make_env


# ---------------------------------------------------------------------------
# Dataset helpers
# ---------------------------------------------------------------------------

def load_dataset(path: str) -> tuple[dict[str, np.ndarray], np.ndarray]:
    """Load dataset.npz → (obs_dict, actions)."""
    data = np.load(path)
    actions = data["actions"]
    obs_keys = [k for k in data.files if k != "actions"]
    obs = {k: data[k] for k in obs_keys}
    print(f"Loaded {len(actions)} (obs, action) pairs from {path}")
    print(f"  obs keys: {obs_keys}")
    print(f"  action range: {actions.min()} – {actions.max()}")
    return obs, actions


def sample_batch(
    obs: dict[str, np.ndarray],
    actions: np.ndarray,
    batch_size: int,
) -> tuple[dict[str, np.ndarray], np.ndarray]:
    """Sample a random minibatch of (obs, action) pairs as numpy arrays."""
    n = len(actions)
    idx = np.random.randint(0, n, size=batch_size)
    obs_batch = {k: v[idx] for k, v in obs.items()}
    action_batch = actions[idx]
    return obs_batch, action_batch


# ---------------------------------------------------------------------------
# BC training
# ---------------------------------------------------------------------------

def bc_pretrain_ppo(model: PPO, obs: dict, actions: np.ndarray, args) -> None:
    """Train PPO policy via negative log-likelihood of human actions."""
    device = model.device
    optimizer = torch.optim.Adam(model.policy.parameters(), lr=args.lr)

    model.policy.train()
    print(f"\nBC pretraining PPO for {args.steps} gradient steps (batch={args.batch_size}, lr={args.lr})")

    for step in range(1, args.steps + 1):
        obs_batch, action_batch_np = sample_batch(obs, actions, args.batch_size)

        # PPO policy forward: get action distribution
        # obs_to_tensor expects numpy arrays and handles device placement internally
        obs_tensor, _ = model.policy.obs_to_tensor(obs_batch)
        action_tensor = torch.as_tensor(action_batch_np, dtype=torch.long, device=device)
        distribution = model.policy.get_distribution(obs_tensor)
        log_prob = distribution.log_prob(action_tensor)   # shape (B,)
        loss = -log_prob.mean()

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        if step % max(1, args.steps // 20) == 0 or step == args.steps:
            print(f"  step {step:6d}/{args.steps}  loss={loss.item():.4f}")

    model.policy.eval()


def bc_pretrain_dqn(model: DQN, obs: dict, actions: np.ndarray, args) -> None:
    """Train DQN Q-network via cross-entropy on human actions."""
    device = model.device
    optimizer = torch.optim.Adam(model.policy.parameters(), lr=args.lr)

    model.policy.train()
    print(f"\nBC pretraining DQN for {args.steps} gradient steps (batch={args.batch_size}, lr={args.lr})")

    for step in range(1, args.steps + 1):
        obs_batch, action_batch_np = sample_batch(obs, actions, args.batch_size)

        # DQN q_net returns Q-values per action — treat as logits for cross-entropy
        obs_tensor, _ = model.policy.obs_to_tensor(obs_batch)
        action_tensor = torch.as_tensor(action_batch_np, dtype=torch.long, device=device)
        q_values = model.policy.q_net(obs_tensor)   # shape (B, n_actions)
        loss = F.cross_entropy(q_values, action_tensor)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        if step % max(1, args.steps // 20) == 0 or step == args.steps:
            print(f"  step {step:6d}/{args.steps}  loss={loss.item():.4f}")

    model.policy.eval()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(args) -> None:
    os.makedirs(args.checkpoint_dir, exist_ok=True)

    obs, actions = load_dataset(args.dataset)

    # Build a dummy env just to register observation/action spaces
    env = DummyVecEnv([make_env(0, native=True)])

    device = torch.device(args.device)

    if args.algo == "ppo":
        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=256),
            net_arch=dict(pi=[128, 128], vf=[512, 512, 256]),
            share_features_extractor=False,
        )
        model = PPO(
            "MultiInputPolicy",
            env,
            policy_kwargs=policy_kwargs,
            device=args.device,
            verbose=0,
        )
        bc_pretrain_ppo(model, obs, actions, args)
        out_path = os.path.join(args.checkpoint_dir, "bc_pretrained_ppo")
        model.save(out_path)

    else:  # dqn
        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=128),
            net_arch=[128, 128],
        )
        model = DQN(
            "MultiInputPolicy",
            env,
            policy_kwargs=policy_kwargs,
            device=args.device,
            verbose=0,
        )
        bc_pretrain_dqn(model, obs, actions, args)
        out_path = os.path.join(args.checkpoint_dir, "bc_pretrained_dqn")
        model.save(out_path)

    env.close()
    print(f"\nBC pretrained model saved to {out_path}.zip")
    print(f"Resume RL fine-tuning with:")
    print(f"  python python/train.py --algo {args.algo} --resume {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Behavioral Cloning pretraining from human demos")
    parser.add_argument("--dataset", default="python/demos/dataset.npz",
                        help="Path to .npz dataset from extract_demos.py")
    parser.add_argument("--algo", choices=["ppo", "dqn"], default="ppo",
                        help="Algorithm to pretrain (default: ppo)")
    parser.add_argument("--steps", type=int, default=10_000,
                        help="Number of gradient steps (default: 10000)")
    parser.add_argument("--batch-size", dest="batch_size", type=int, default=256,
                        help="Minibatch size (default: 256)")
    parser.add_argument("--lr", type=float, default=1e-4,
                        help="Learning rate (default: 1e-4)")
    parser.add_argument("--device", default="mps",
                        help="PyTorch device: mps, cuda, cpu (default: mps)")
    parser.add_argument("--checkpoint-dir", dest="checkpoint_dir",
                        default="python/checkpoints",
                        help="Directory to save the pretrained model")
    args = parser.parse_args()
    main(args)
