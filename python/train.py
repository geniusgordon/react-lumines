"""
train.py — PPO training for the Lumines RL agent.

Architecture:
  Two-branch features extractor fed into SB3 MultiInputPolicy:
    1. CNN branch   : board (10×16) → Conv2d → flatten → Linear(64) → ReLU
    2. MLP branch   : current_block(4) + queue(8) + block_position(2)
                      + timeline_x(1) + game_timer(1) = 16 values
                      → Linear(16→64) → ReLU
  Both branches concatenated (128-dim) → SB3 policy + value heads.

Usage:
    python python/train.py
    python python/train.py --timesteps 500000 --envs 8 --device mps
    python python/train.py --resume                        # continues from best_model
    python python/train.py --resume python/checkpoints/lumines_ppo_500000_steps
    python python/train.py --no-native                     # use Node.js IPC env instead
"""

import argparse
import os

import numpy as np
import torch
import torch.nn as nn
from gymnasium import spaces
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import SubprocVecEnv, VecNormalize

# Import from the same python/ directory
import sys
sys.path.insert(0, os.path.dirname(__file__))
from lumines_env import LuminesEnv


# ---------------------------------------------------------------------------
# Features extractor
# ---------------------------------------------------------------------------

class LuminesCNNExtractor(BaseFeaturesExtractor):
    """
    Two-branch features extractor:
      - CNN branch for the board observation
      - MLP branch for scalar/small observations
    Output: 128-dim concatenation.
    """

    # Keys to route through the MLP branch (flattened and concatenated)
    MLP_KEYS = ["current_block", "queue", "block_position", "timeline_x", "game_timer"]

    def __init__(self, observation_space: spaces.Dict, features_dim: int = 128):
        super().__init__(observation_space, features_dim)

        # ---- CNN branch (board: 10×16) ----
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Flatten(),
        )
        # Compute CNN output size with a dummy forward pass
        with torch.no_grad():
            dummy_board = torch.zeros(1, 1, 10, 16)
            cnn_out_size = self.cnn(dummy_board).shape[1]

        self.cnn_linear = nn.Sequential(
            nn.Linear(cnn_out_size, 64),
            nn.ReLU(),
        )

        # ---- MLP branch (scalar observations) ----
        mlp_input_size = sum(
            int(np.prod(observation_space[k].shape)) for k in self.MLP_KEYS
        )
        self.mlp = nn.Sequential(
            nn.Linear(mlp_input_size, 64),
            nn.ReLU(),
        )

    def forward(self, observations: dict) -> torch.Tensor:
        # CNN branch
        board = observations["board"].float() / 2.0  # normalise [0,2] → [0,1]
        board = board.unsqueeze(1)  # add channel dim: (B, 1, 10, 16)
        cnn_out = self.cnn_linear(self.cnn(board))

        # MLP branch — flatten and concatenate all scalar obs
        mlp_parts = [observations[k].float().flatten(start_dim=1) for k in self.MLP_KEYS]
        mlp_out = self.mlp(torch.cat(mlp_parts, dim=1))

        return torch.cat([cnn_out, mlp_out], dim=1)  # (B, 128)


# ---------------------------------------------------------------------------
# Env factory helpers
# ---------------------------------------------------------------------------

def make_env(seed: int, native: bool = False):
    def _init():
        if native:
            from game.env import LuminesEnvNative
            env = LuminesEnvNative(mode="per_block", seed=str(seed))
        else:
            env = LuminesEnv(mode="per_block", seed=str(seed))
        env = Monitor(env)
        return env
    return _init


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(args):
    os.makedirs(args.checkpoint_dir, exist_ok=True)
    os.makedirs(args.log_dir, exist_ok=True)

    # Parallel training envs
    env = SubprocVecEnv([make_env(i, native=args.native) for i in range(args.envs)])

    # Held-out eval env (single, unwrapped normalization so scores are raw)
    eval_env = SubprocVecEnv([make_env(9999, native=args.native)])
    eval_env = VecNormalize(eval_env, norm_obs=False, norm_reward=False, training=False)

    if args.resume is not None:
        # Resolve checkpoint path: bare flag uses best_model, otherwise use given path
        checkpoint = args.resume if args.resume else os.path.join(args.checkpoint_dir, "best_model")
        vec_normalize_path = os.path.join(args.checkpoint_dir, "vec_normalize.pkl")

        print(f"Resuming from {checkpoint} ...")
        env = VecNormalize.load(vec_normalize_path, env)
        env.training = True

        model = PPO.load(
            checkpoint,
            env=env,
            device=args.device,
            tensorboard_log=args.log_dir,
        )
        reset_num_timesteps = False
    else:
        env = VecNormalize(env, norm_obs=False, norm_reward=True, clip_reward=10.0)

        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=128),
            net_arch=[],  # no extra shared layers; extractor feeds directly to heads
        )

        model = PPO(
            "MultiInputPolicy",
            env,
            n_steps=512,
            batch_size=256,
            n_epochs=4,
            learning_rate=args.lr,
            ent_coef=args.ent_coef,
            clip_range=0.1,
            target_kl=0.01,
            policy_kwargs=policy_kwargs,
            tensorboard_log=args.log_dir,
            device=args.device,
            verbose=1,
        )
        reset_num_timesteps = True

    callbacks = [
        CheckpointCallback(
            save_freq=50_000 // args.envs,  # per-env steps
            save_path=args.checkpoint_dir,
            name_prefix="lumines_ppo",
        ),
        EvalCallback(
            eval_env,
            best_model_save_path=args.checkpoint_dir,
            log_path=args.log_dir,
            eval_freq=args.eval_freq // args.envs,
            n_eval_episodes=args.eval_episodes,
            deterministic=True,
            render=False,
        ),
    ]

    model.learn(total_timesteps=args.timesteps, callback=callbacks, reset_num_timesteps=reset_num_timesteps)

    final_path = os.path.join(args.checkpoint_dir, "final")
    model.save(final_path)
    env.save(os.path.join(args.checkpoint_dir, "vec_normalize.pkl"))
    print(f"\nTraining complete. Model saved to {final_path}.zip")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Lumines PPO agent")
    parser.add_argument("--timesteps", type=int, default=2_000_000)
    parser.add_argument("--envs", type=int, default=8)
    parser.add_argument("--device", type=str, default="mps")
    parser.add_argument("--checkpoint-dir", dest="checkpoint_dir", default="python/checkpoints")
    parser.add_argument("--log-dir", dest="log_dir", default="python/logs")
    parser.add_argument("--eval-freq", dest="eval_freq", type=int, default=50_000,
                        help="Total timesteps between evaluations")
    parser.add_argument("--eval-episodes", dest="eval_episodes", type=int, default=5,
                        help="Number of episodes per evaluation")
    parser.add_argument("--ent-coef", dest="ent_coef", type=float, default=0.2,
                        help="Entropy coefficient for exploration (default: 0.2)")
    parser.add_argument("--lr", type=float, default=3e-4,
                        help="Constant learning rate (default: 3e-4)")
    parser.add_argument(
        "--resume",
        nargs="?",        # 0 or 1 args: bare flag → None (uses best_model), or a path
        const="",         # value when flag is present with no argument
        default=None,     # value when flag is absent
        metavar="CHECKPOINT",
        help="Resume training. Optionally provide a checkpoint path (default: best_model).",
    )
    parser.add_argument(
        "--no-native",
        dest="native",
        action="store_false",
        help="Use Node.js IPC subprocess env instead of pure Python env",
    )
    parser.set_defaults(native=True)
    args = parser.parse_args()

    train(args)
