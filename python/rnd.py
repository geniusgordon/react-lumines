"""
rnd.py — Random Network Distillation exploration bonus for PPO.

Components:
  RNDTargetNetwork    — frozen, random init; defines the "novelty" embedding space
  RNDPredictorNetwork — trained to match target; low error = familiar state
  RNDVecWrapper       — VecEnvWrapper that adds β * r_int to rewards each step
  RNDCallback         — trains predictor at on_rollout_end, logs to TensorBoard
"""

import numpy as np
import torch
import torch.nn as nn


# ---------------------------------------------------------------------------
# Networks
# ---------------------------------------------------------------------------

class RNDTargetNetwork(nn.Module):
    """Frozen random network. Defines the target embedding space."""

    def __init__(self, embedding_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(7, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Flatten(),
            nn.Linear(32 * 10 * 16, embedding_dim),
        )
        # Freeze all parameters — gradients must never update this network
        for p in self.parameters():
            p.requires_grad = False

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class RNDPredictorNetwork(nn.Module):
    """Trained to predict target embeddings. Larger than target to avoid trivial solutions."""

    def __init__(self, embedding_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(7, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Flatten(),
            nn.Linear(32 * 10 * 16, 256),
            nn.ReLU(),
            nn.Linear(256, embedding_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ---------------------------------------------------------------------------
# VecEnvWrapper
# ---------------------------------------------------------------------------

from stable_baselines3.common.vec_env import VecEnvWrapper


# Board channel keys — must match LuminesEnvNative observation_space order
BOARD_KEYS = [
    "light_board",
    "dark_board",
    "light_pattern_board",
    "dark_pattern_board",
    "proj_light_pattern_board",
    "proj_dark_pattern_board",
    "timeline_col",
]


class RNDVecWrapper(VecEnvWrapper):
    """
    VecEnvWrapper that adds β * r_int to rewards at each step.

    Must be stacked OUTSIDE VecNormalize so RND sees normalized obs:
        SubprocVecEnv → VecNormalize → RNDVecWrapper

    r_int = ||target(board_obs) - predictor(board_obs)||².mean(dim=-1)
    r_int is normalized by a running std and clipped to [0, 5.0].
    """

    def __init__(self, venv, beta: float, device: str = "cpu"):
        super().__init__(venv)
        self.beta = beta
        self.device = torch.device(device)

        self.target = RNDTargetNetwork().to(self.device)
        self.predictor = RNDPredictorNetwork().to(self.device)
        # target is already frozen (requires_grad=False in RNDTargetNetwork.__init__)

        # Welford running stats for r_int normalization
        self._r_int_count: int = 0
        self._r_int_mean: float = 0.0
        self._r_int_var: float = 1.0   # M2 accumulator (not divided by n yet)

    # ------------------------------------------------------------------
    # VecEnvWrapper API
    # ------------------------------------------------------------------

    def reset(self):
        return self.venv.reset()

    def step_wait(self):
        obs, rewards, dones, infos = self.venv.step_wait()
        r_int = self._compute_r_int(obs)
        rewards = rewards + self.beta * r_int
        return obs, rewards, dones, infos

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _extract_board_tensor(self, obs_dict: dict) -> torch.Tensor:
        """Stack the 7 board channels from a VecEnv obs dict → (n_envs, 7, 10, 16)."""
        boards = np.stack([obs_dict[k] for k in BOARD_KEYS], axis=1).astype(np.float32)
        return torch.tensor(boards, device=self.device)

    def _compute_r_int(self, obs_dict: dict) -> np.ndarray:
        """
        Returns normalized, clipped intrinsic reward of shape (n_envs,).
        Also updates running mean/var for the normalization stats.
        """
        board_t = self._extract_board_tensor(obs_dict)
        with torch.no_grad():
            t_out = self.target(board_t)
            p_out = self.predictor(board_t)
            r_int = (t_out - p_out).pow(2).mean(dim=-1).cpu().numpy()  # (n_envs,)

        # Welford online update
        for val in r_int:
            self._r_int_count += 1
            delta = val - self._r_int_mean
            self._r_int_mean += delta / self._r_int_count
            delta2 = val - self._r_int_mean
            self._r_int_var += delta * delta2

        r_int_std = np.sqrt(max(self._r_int_var / max(1, self._r_int_count), 1e-8))
        return np.clip(r_int / r_int_std, 0.0, 5.0)

    # ------------------------------------------------------------------
    # Checkpointing
    # ------------------------------------------------------------------

    def save(self, path: str) -> None:
        """Save predictor weights + running normalization stats."""
        torch.save(
            {
                "predictor": self.predictor.state_dict(),
                "r_int_count": self._r_int_count,
                "r_int_mean": self._r_int_mean,
                "r_int_var": self._r_int_var,
            },
            path,
        )

    @staticmethod
    def load_state(path: str, wrapper: "RNDVecWrapper") -> None:
        """Load predictor weights + stats into an existing wrapper in-place."""
        state = torch.load(path, map_location=wrapper.device, weights_only=False)
        wrapper.predictor.load_state_dict(state["predictor"])
        wrapper._r_int_count = state["r_int_count"]
        wrapper._r_int_mean = state["r_int_mean"]
        wrapper._r_int_var = state["r_int_var"]


# ---------------------------------------------------------------------------
# Callback
# ---------------------------------------------------------------------------

from stable_baselines3.common.callbacks import BaseCallback


class RNDCallback(BaseCallback):
    """
    Trains the RND predictor at the end of each PPO rollout.

    Reads board observations from model.rollout_buffer.observations,
    runs one epoch of mini-batch SGD on the predictor, and logs metrics
    to TensorBoard.
    """

    def __init__(
        self,
        rnd_wrapper: RNDVecWrapper,
        lr: float = 1e-4,
        train_samples: int = 8192,
        batch_size: int = 256,
        verbose: int = 0,
    ):
        super().__init__(verbose=verbose)
        self.rnd = rnd_wrapper
        self.train_samples = train_samples
        self.batch_size = batch_size
        self.optimizer = torch.optim.Adam(rnd_wrapper.predictor.parameters(), lr=lr)

    def _on_step(self) -> bool:
        return True

    def _on_rollout_end(self) -> None:
        obs_dict = self.model.rollout_buffer.observations
        # obs_dict values have shape (n_steps, n_envs, H, W)
        boards = np.stack(
            [obs_dict[k].reshape(-1, 10, 16) for k in BOARD_KEYS],
            axis=1,
        ).astype(np.float32)  # (n_steps * n_envs, 7, 10, 16)

        n = len(boards)
        if n > self.train_samples:
            idx = np.random.choice(n, self.train_samples, replace=False)
            boards = boards[idx]

        boards_t = torch.tensor(boards, device=self.rnd.device)

        total_loss = 0.0
        n_batches = 0
        for start in range(0, len(boards_t), self.batch_size):
            batch = boards_t[start : start + self.batch_size]
            with torch.no_grad():
                t_out = self.rnd.target(batch)
            p_out = self.rnd.predictor(batch)
            loss = (t_out - p_out).pow(2).mean()
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()
            total_loss += loss.item()
            n_batches += 1

        mean_loss = total_loss / max(1, n_batches)
        r_int_std = np.sqrt(
            max(self.rnd._r_int_var / max(1, self.rnd._r_int_count), 1e-8)
        )

        self.logger.record("rnd/predictor_loss", mean_loss)
        self.logger.record("rnd/mean_r_int", self.rnd._r_int_mean)
        self.logger.record("rnd/r_int_std", float(r_int_std))
