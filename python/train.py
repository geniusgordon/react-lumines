"""
train.py — DQN/PPO training for the Lumines RL agent.

Architecture:
  Two-branch features extractor fed into SB3 MultiInputPolicy:
    1. CNN branch   : 7-channel board input (10×16) → 4 × Conv2d(3×3,pad=1,64ch) → flatten → Linear(10240→64) → ReLU
                      Channels: light_board, dark_board, light_pattern_board, dark_pattern_board,
                                proj_light_pattern_board, proj_dark_pattern_board, timeline_col
                      (timeline_col retained: gives CNN spatial anchor for the sweep boundary so it can
                       correctly interpret live vs projected pattern channels relative to the sweep)
    2. MLP branch   : current_block(4) + queue(12)
                      + timeline_x(1)
                      + holding_score(1) + light_chain(1) + dark_chain(1) = 20 values
                      → Linear(20→64) → ReLU
  Both branches concatenated (128-dim) → SB3 Q-network / policy head.

Usage:
    python python/train.py                                      # DQN (default)
    python python/train.py --algo ppo                           # PPO
    python python/train.py --algo ppo --timesteps 2000000 --envs 8 --device mps
    python python/train.py --algo dqn                           # DQN
    python python/train.py --resume                             # continues from best_model
    python python/train.py --resume python/checkpoints/lumines_dqn_500000_steps
    python python/train.py --no-native                          # use Node.js IPC env instead
"""

import argparse
import os

import copy

import numpy as np
import torch
import torch.nn as nn
from gymnasium import spaces
from stable_baselines3 import DQN, PPO
from sb3_contrib import RecurrentPPO
from stable_baselines3.common.callbacks import BaseCallback, CheckpointCallback, EvalCallback
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import SubprocVecEnv, DummyVecEnv, VecNormalize

# Import from the same python/ directory
import sys
sys.path.insert(0, os.path.dirname(__file__))
from lumines_env import LuminesEnv


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def linear_schedule(initial_lr: float, final_lr: float):
    """Returns a callable for SB3's learning_rate: decays linearly with training progress."""
    def func(progress_remaining: float) -> float:
        return final_lr + progress_remaining * (initial_lr - final_lr)
    return func


def cosine_warmrestart_schedule(
    initial_lr: float,
    final_lr: float,
    n_restarts: int = 3,
):
    """Cosine decay with warm restarts (Loshchilov & Hutter 2017).

    Divides total training into ``n_restarts`` equal cycles. Within each cycle
    the LR follows a half-cosine from ``initial_lr`` → ``final_lr``. At each
    restart it jumps back to ``initial_lr``, forcing the policy to re-explore
    beyond local optima.

    SB3 passes ``progress_remaining`` ∈ [1.0 → 0.0] as training advances.
    """
    import math

    def func(progress_remaining: float) -> float:
        progress = 1.0 - progress_remaining          # 0.0 → 1.0
        cycle_len = 1.0 / n_restarts
        cycle_pos = (progress % cycle_len) / cycle_len   # position within current cycle [0, 1)
        cosine_factor = 0.5 * (1.0 + math.cos(math.pi * cycle_pos))
        return final_lr + cosine_factor * (initial_lr - final_lr)

    return func


# ---------------------------------------------------------------------------
# Features extractor
# ---------------------------------------------------------------------------

class LuminesCNNExtractor(BaseFeaturesExtractor):
    """
    Two-branch features extractor:
      - CNN branch for the board observation
      - MLP branch for scalar/small observations
    Output: features_dim-dim concatenation (features_dim // 2 from each branch).
    """

    # Keys to route through the MLP branch (flattened and concatenated).
    # light_board, dark_board, light_pattern_board, dark_pattern_board,
    # proj_light_pattern_board, proj_dark_pattern_board, timeline_col are routed through the CNN branch.
    MLP_KEYS = ["current_block", "queue", "timeline_x", "holding_score", "light_chain", "dark_chain"]

    def __init__(self, observation_space: spaces.Dict, features_dim: int = 128):
        super().__init__(observation_space, features_dim)
        branch_dim = features_dim // 2

        # ---- CNN branch (board: 10×16, 7 channels: light_board + dark_board + light_pattern_board
        #                  + dark_pattern_board + proj_light_pattern_board + proj_dark_pattern_board
        #                  + timeline_col) ----
        self.cnn = nn.Sequential(
            nn.Conv2d(7, 64, kernel_size=3, padding=1),   # stem: 7 → 64 channels
            nn.ReLU(),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),  # RF: 5×5
            nn.ReLU(),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),  # RF: 7×7
            nn.ReLU(),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),  # RF: 9×9
            nn.ReLU(),
            nn.Flatten(),
        )
        # Output is always 64 * 10 * 16 = 10240 (padding=1 preserves spatial dims, no stride)

        self.cnn_linear = nn.Sequential(
            nn.Linear(10240, branch_dim),
            nn.ReLU(),
        )

        # ---- MLP branch (scalar observations) ----
        mlp_input_size = sum(
            int(np.prod(observation_space[k].shape)) for k in self.MLP_KEYS
        )
        self.mlp = nn.Sequential(
            nn.Linear(mlp_input_size, branch_dim),
            nn.ReLU(),
        )

    def forward(self, observations: dict) -> torch.Tensor:
        # CNN branch — stack 7 channels as input
        light = observations["light_board"].float()               # [B, 10, 16], binary 0/1
        dark  = observations["dark_board"].float()                # [B, 10, 16], binary 0/1
        lp    = observations["light_pattern_board"].float()       # [B, 10, 16], values 0–1
        dp    = observations["dark_pattern_board"].float()        # [B, 10, 16], values 0–1
        plp   = observations["proj_light_pattern_board"].float()  # [B, 10, 16], projected post-clear, values 0–1
        pdp   = observations["proj_dark_pattern_board"].float()   # [B, 10, 16], projected post-clear, values 0–1
        tl    = observations["timeline_col"].float()              # [B, 10, 16], binary sweep position
        x = torch.stack([light, dark, lp, dp, plp, pdp, tl], dim=1)  # [B, 7, 10, 16]
        cnn_out = self.cnn_linear(self.cnn(x))

        # MLP branch — flatten and concatenate all scalar obs
        mlp_parts = [observations[k].float().flatten(start_dim=1) for k in self.MLP_KEYS]
        mlp_out = self.mlp(torch.cat(mlp_parts, dim=1))

        return torch.cat([cnn_out, mlp_out], dim=1)


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
# Callbacks
# ---------------------------------------------------------------------------

class EntropyScheduleCallback(BaseCallback):
    """Linearly decays ent_coef from initial_ent to final_ent over total_steps.

    ``floor_ent`` sets a hard lower bound so entropy never fully collapses — the
    policy always retains some exploration pressure even late in training.
    """
    def __init__(self, initial_ent: float, final_ent: float, total_steps: int, floor_ent: float = 0.02):
        super().__init__()
        self.initial_ent = initial_ent
        self.final_ent = final_ent
        self.total_steps = total_steps
        self.floor_ent = floor_ent

    def _on_step(self) -> bool:
        progress = min(1.0, self.model.num_timesteps / self.total_steps)
        scheduled = self.initial_ent + progress * (self.final_ent - self.initial_ent)
        self.model.ent_coef = max(self.floor_ent, scheduled)
        return True


class GameScoreCallback(BaseCallback):
    """Logs per-rollout metrics to TensorBoard.

    Per-episode (accumulated on done):
      rollout/ep_game_score_mean, rollout/ep_game_score_max
      rollout/ep_game_score_std        — spread of returns; high = inconsistent policy
      rollout/ep_peak_combo_len_mean, rollout/ep_peak_combo_len_max
      rollout/death_rate               — fraction of episodes that ended by death

    Per-step (accumulated every step):
      rollout/score_delta_mean         — mean game points earned per step
      rollout/chain_shaping_mean       — mean chain extension bonus per step

    Action distribution (per-step, per_block mode only):
      rollout/action_col_left_frac     — fraction of placements in cols 0–4
      rollout/action_col_center_frac   — fraction of placements in cols 5–9
      rollout/action_col_right_frac    — fraction of placements in cols 10–14
      rollout/action_rot0_frac .. rollout/action_rot3_frac
    """

    def __init__(self, verbose: int = 0):
        super().__init__(verbose)
        self._episode_scores: list[float] = []
        self._episode_peak_combo: list[float] = []
        self._episode_deaths: list[float] = []
        self._score_deltas: list[float] = []
        self._chain_shapings: list[float] = []
        self._actions: list[int] = []

    def _on_step(self) -> bool:
        dones = self.locals.get("dones", [])
        infos = self.locals.get("infos", [])
        actions = self.locals.get("actions", [])

        for info in infos:
            rc = info.get("reward_components", {})
            if rc:
                self._score_deltas.append(float(rc.get("score_delta", 0.0)))
                self._chain_shapings.append(float(rc.get("chain_shaping", 0.0)))

        for a in actions:
            self._actions.append(int(a))

        for done, info in zip(dones, infos):
            if done:
                score = info.get("finalScore")
                if score is not None:
                    self._episode_scores.append(float(score))
                self._episode_peak_combo.append(float(info.get("peakComboLen", 0.0)))
                rc = info.get("reward_components", {})
                self._episode_deaths.append(1.0 if rc.get("death", 0.0) < 0 else 0.0)

        return True

    def _on_rollout_end(self) -> None:
        if self._episode_scores:
            self.logger.record("rollout/ep_game_score_mean", np.mean(self._episode_scores))
            self.logger.record("rollout/ep_game_score_max", float(np.max(self._episode_scores)))
            self.logger.record("rollout/ep_game_score_std", float(np.std(self._episode_scores)))
            self._episode_scores = []

        if self._episode_peak_combo:
            self.logger.record("rollout/ep_peak_combo_len_mean", np.mean(self._episode_peak_combo))
            self.logger.record("rollout/ep_peak_combo_len_max", float(np.max(self._episode_peak_combo)))
            self._episode_peak_combo = []

        if self._episode_deaths:
            self.logger.record("rollout/death_rate", float(np.mean(self._episode_deaths)))
            self._episode_deaths = []

        if self._score_deltas:
            self.logger.record("rollout/score_delta_mean", float(np.mean(self._score_deltas)))
            self._score_deltas = []

        if self._chain_shapings:
            self.logger.record("rollout/chain_shaping_mean", float(np.mean(self._chain_shapings)))
            self._chain_shapings = []

        if self._actions:
            actions = np.array(self._actions)
            n = len(actions)
            # per_block: action = target_x * 4 + rotation  (x in 0..14, rot in 0..3)
            # Only meaningful for Discrete(60); skip if action space is different
            if actions.max() < 60:
                cols = actions // 4
                rots = actions % 4
                self.logger.record("rollout/action_col_left_frac",   float(np.mean(cols <= 4)))
                self.logger.record("rollout/action_col_center_frac", float(np.mean((cols >= 5) & (cols <= 9))))
                self.logger.record("rollout/action_col_right_frac",  float(np.mean(cols >= 10)))
                for r in range(4):
                    self.logger.record(f"rollout/action_rot{r}_frac", float(np.mean(rots == r)))
            self._actions = []


class SyncAndSaveVecNormalizeCallback(BaseCallback):
    """Syncs eval env obs normalization stats from train env, saves stats, and logs
    mean game score (true score, not shaped reward) over ``n_score_episodes`` eval
    episodes as ``eval/mean_game_score`` / ``eval/max_game_score``."""

    def __init__(
        self,
        train_env: VecNormalize,
        eval_env: VecNormalize,
        path: str,
        n_score_episodes: int = 20,
    ):
        super().__init__()
        self.train_env = train_env
        self.eval_env = eval_env
        self.path = path
        self.n_score_episodes = n_score_episodes

    def _on_step(self) -> bool:
        # Keep eval env's obs normalization in sync with training env so the
        # policy sees the same observation distribution at eval time.
        self.eval_env.obs_rms = copy.deepcopy(self.train_env.obs_rms)
        self.train_env.save(self.path)

        # Run dedicated eval episodes to measure the true game score, unaffected
        # by reward shaping — makes runs with different reward functions comparable.
        scores: list[float] = []
        obs = self.eval_env.reset()
        done_count = 0
        while done_count < self.n_score_episodes:
            action, _ = self.model.predict(obs, deterministic=True)
            obs, _rewards, dones, infos = self.eval_env.step(action)
            for done, info in zip(dones, infos):
                if done:
                    score = info.get("finalScore")
                    if score is not None:
                        scores.append(float(score))
                    done_count += 1

        if scores:
            self.logger.record("eval/mean_game_score", np.mean(scores))
            self.logger.record("eval/max_game_score", float(np.max(scores)))

        return True


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(args):
    os.makedirs(args.checkpoint_dir, exist_ok=True)
    os.makedirs(args.log_dir, exist_ok=True)

    VecEnvCls = DummyVecEnv if args.dummy else SubprocVecEnv
    env = VecEnvCls([make_env(i, native=args.native) for i in range(args.envs)])
    eval_env = DummyVecEnv([make_env(9999, native=args.native)])

    if args.algo == "ppo":
        _train_ppo(args, env, eval_env)
    else:
        _train_dqn(args, env, eval_env)


def _train_dqn(args, env, eval_env):
    if args.resume is not None:
        checkpoint = args.resume if args.resume else os.path.join(args.checkpoint_dir, "best_model")
        print(f"Resuming from {checkpoint} ...")
        model = DQN.load(checkpoint, env=env, device=args.device, tensorboard_log=args.log_dir)
        reset_num_timesteps = False
    else:
        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=128),
            net_arch=[128, 128],
        )
        model = DQN(
            "MultiInputPolicy",
            env,
            learning_rate=args.lr,
            buffer_size=200_000,
            learning_starts=10_000,
            batch_size=256,
            gamma=0.99,
            train_freq=4,
            gradient_steps=1,
            target_update_interval=1000,
            exploration_fraction=0.5,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            policy_kwargs=policy_kwargs,
            tensorboard_log=args.log_dir,
            device=args.device,
            verbose=1,
        )
        reset_num_timesteps = True

    callbacks = [
        CheckpointCallback(
            save_freq=50_000 // args.envs,
            save_path=args.checkpoint_dir,
            name_prefix="lumines_dqn",
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
        GameScoreCallback(),
    ]

    model.learn(total_timesteps=args.timesteps, callback=callbacks, reset_num_timesteps=reset_num_timesteps)

    final_path = os.path.join(args.checkpoint_dir, "final_dqn")
    model.save(final_path)
    print(f"\nTraining complete. Model saved to {final_path}.zip")


def _train_ppo(args, env, eval_env):
    norm_stats_path = os.path.join(args.checkpoint_dir, "vecnormalize.pkl")

    if args.resume is not None:
        checkpoint = args.resume if args.resume else os.path.join(args.checkpoint_dir, "best_model_ppo")
        print(f"Resuming PPO from {checkpoint} ...")
        if os.path.exists(norm_stats_path):
            env = VecNormalize.load(norm_stats_path, env)
            eval_env = VecNormalize.load(norm_stats_path, eval_env)
        else:
            print(f"No VecNormalize stats found at {norm_stats_path}, starting with fresh normalizer.")
            env = VecNormalize(env, norm_obs=True, norm_reward=False)
            eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)
        env.training = True
        eval_env.training = False
        eval_env.norm_reward = False
        vec_normalize = env  # keep reference for VecNormalize.save() calls

        loader = RecurrentPPO if args.recurrent else PPO
        model = loader.load(checkpoint, env=env, device=args.device, tensorboard_log=args.log_dir)
        reset_num_timesteps = False
    else:
        env = VecNormalize(env, norm_obs=True, norm_reward=False)
        eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)
        vec_normalize = env  # keep reference for VecNormalize.save() calls

        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=256),
            net_arch=dict(pi=[128, 128], vf=[512, 512, 256]),
            share_features_extractor=False,
        )
        if args.recurrent:
            recurrent_policy_kwargs = copy.deepcopy(policy_kwargs)
            recurrent_policy_kwargs["lstm_hidden_size"] = 256
            model = RecurrentPPO(
                "MultiInputLstmPolicy",
                env,
                learning_rate=cosine_warmrestart_schedule(3e-5, 3e-6, n_restarts=3),
                n_steps=4096,
                batch_size=256,
                n_epochs=10,
                gamma=0.99,
                gae_lambda=0.99,
                clip_range=0.2,
                clip_range_vf=0.2,
                ent_coef=0.1,
                vf_coef=1.0,
                max_grad_norm=0.5,
                target_kl=0.008,
                policy_kwargs=recurrent_policy_kwargs,
                tensorboard_log=args.log_dir,
                device=args.device,
                verbose=1,
            )
        else:
            model = PPO(
                "MultiInputPolicy",
                env,
                learning_rate=cosine_warmrestart_schedule(3e-5, 3e-6, n_restarts=3),
                n_steps=4096,
                batch_size=256,
                n_epochs=10,
                gamma=0.99,
                gae_lambda=0.99,
                clip_range=0.2,
                clip_range_vf=0.2,
                ent_coef=0.1,
                vf_coef=1.0,
                max_grad_norm=0.5,
                target_kl=0.008,
                policy_kwargs=policy_kwargs,
                tensorboard_log=args.log_dir,
                device=args.device,
                verbose=1,
            )
        reset_num_timesteps = True

    callbacks = [
        CheckpointCallback(
            save_freq=50_000 // args.envs,
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
            callback_after_eval=SyncAndSaveVecNormalizeCallback(vec_normalize, eval_env, norm_stats_path),
        ),
        EntropyScheduleCallback(initial_ent=0.15, final_ent=0.05, total_steps=args.timesteps),
        GameScoreCallback(),
    ]

    if not reset_num_timesteps:
        # SB3's configure_logger subtracts 1 when reset_num_timesteps=False, reusing the
        # existing run directory. Force a new numbered directory by setting the logger manually.
        import glob as _glob
        from stable_baselines3.common.logger import configure as _sb3_configure
        existing = _glob.glob(os.path.join(args.log_dir, "PPO_*"))
        ids = [int(p.split("_")[-1]) for p in existing if p.split("_")[-1].isdigit()]
        next_id = max(ids, default=0) + 1
        new_log_dir = os.path.join(args.log_dir, f"PPO_{next_id}")
        model.set_logger(_sb3_configure(new_log_dir, ["stdout", "tensorboard"]))
        print(f"TensorBoard logging to {new_log_dir}")

    model.learn(total_timesteps=args.timesteps, callback=callbacks, reset_num_timesteps=reset_num_timesteps)

    vec_normalize.save(norm_stats_path)
    final_path = os.path.join(args.checkpoint_dir, "final_ppo")
    model.save(final_path)
    print(f"\nTraining complete. Model saved to {final_path}.zip")
    print(f"VecNormalize stats saved to {norm_stats_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Lumines DQN/PPO agent")
    parser.add_argument("--timesteps", type=int, default=3_000_000)
    parser.add_argument("--envs", type=int, default=32)
    parser.add_argument("--device", type=str, default="mps")
    parser.add_argument("--checkpoint-dir", dest="checkpoint_dir", default="python/checkpoints")
    parser.add_argument("--log-dir", dest="log_dir", default="python/logs")
    parser.add_argument("--eval-freq", dest="eval_freq", type=int, default=50_000,
                        help="Total timesteps between evaluations")
    parser.add_argument("--eval-episodes", dest="eval_episodes", type=int, default=100,
                        help="Number of episodes per evaluation")
    parser.add_argument("--lr", type=float, default=1e-4,
                        help="Learning rate (default: 1e-4)")
    parser.add_argument(
        "--resume",
        nargs="?",
        const="",
        default=None,
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
    parser.add_argument(
        "--dummy",
        action="store_true",
        default=False,
        help="Use DummyVecEnv (single-process, no IPC) instead of SubprocVecEnv",
    )
    parser.add_argument(
        "--algo",
        choices=["dqn", "ppo"],
        default="ppo",
        help="RL algorithm to use (default: ppo)",
    )
    parser.add_argument(
        "--recurrent",
        action="store_true",
        default=False,
        help="Use RecurrentPPO (LSTM) instead of flat PPO",
    )
    args = parser.parse_args()

    train(args)
