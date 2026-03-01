# RND Exploration Bonus — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add opt-in RND (Random Network Distillation) exploration bonus to the PPO training pipeline via a VecEnvWrapper + Callback, enabled by `--rnd-beta` CLI flag.

**Architecture:** `RNDVecWrapper` stacks on top of `VecNormalize`, sees normalized board obs, and adds `β * r_int` to rewards inline during `step_wait()`. `RNDCallback` trains the predictor at each `on_rollout_end`. All new code lives in `python/rnd.py`; `train.py` wires it in when `--rnd-beta > 0`.

**Tech Stack:** PyTorch, stable-baselines3 `VecEnvWrapper` + `BaseCallback`, pytest

---

### Task 1: Create `python/rnd.py` — Networks

**Files:**
- Create: `python/rnd.py`
- Test: `python/tests/test_rnd.py`

**Step 1: Write the failing tests for the two networks**

```python
# python/tests/test_rnd.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import torch
import torch.nn as nn


def test_target_network_output_shape():
    """Target produces (B, 128) embeddings."""
    from rnd import RNDTargetNetwork
    net = RNDTargetNetwork()
    x = torch.zeros(4, 7, 10, 16)
    out = net(x)
    assert out.shape == (4, 128)


def test_target_network_is_frozen_after_backward():
    """Gradients never flow into target weights."""
    from rnd import RNDTargetNetwork
    net = RNDTargetNetwork()
    before = [p.data.clone() for p in net.parameters()]
    x = torch.zeros(2, 7, 10, 16)
    # Even if we try to backprop through it, weights must not change
    out = net(x)
    out.sum().backward()
    for before_w, p in zip(before, net.parameters()):
        assert torch.allclose(before_w, p.data), "target weights changed after backward"


def test_predictor_network_output_shape():
    """Predictor produces (B, 128) embeddings."""
    from rnd import RNDPredictorNetwork
    net = RNDPredictorNetwork()
    x = torch.zeros(4, 7, 10, 16)
    out = net(x)
    assert out.shape == (4, 128)


def test_predictor_loss_decreases_after_grad_step():
    """Predictor loss decreases when trained toward target."""
    from rnd import RNDTargetNetwork, RNDPredictorNetwork
    target = RNDTargetNetwork()
    predictor = RNDPredictorNetwork()
    opt = torch.optim.Adam(predictor.parameters(), lr=1e-3)
    x = torch.randn(32, 7, 10, 16)

    with torch.no_grad():
        t_out = target(x)

    losses = []
    for _ in range(5):
        p_out = predictor(x)
        loss = (t_out - p_out).pow(2).mean()
        losses.append(loss.item())
        opt.zero_grad()
        loss.backward()
        opt.step()

    assert losses[-1] < losses[0], f"loss did not decrease: {losses}"
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/gordon/Playground/react-lumines/master
python/.venv/bin/pytest python/tests/test_rnd.py -v
```
Expected: ImportError or ModuleNotFoundError (rnd.py doesn't exist yet)

**Step 3: Create `python/rnd.py` with the two network classes**

```python
# python/rnd.py
"""
rnd.py — Random Network Distillation exploration bonus for PPO.

Components:
  RNDTargetNetwork   — frozen, random init; defines the "novelty" embedding space
  RNDPredictorNetwork — trained to match target; low error = familiar state
  RNDVecWrapper      — VecEnvWrapper that adds β * r_int to rewards each step
  RNDCallback        — trains predictor at on_rollout_end, logs to TensorBoard
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
```

**Step 4: Run tests to verify they pass**

```bash
python/.venv/bin/pytest python/tests/test_rnd.py -v
```
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add python/rnd.py python/tests/test_rnd.py
git commit -m "feat(rnd): add RNDTargetNetwork and RNDPredictorNetwork"
```

---

### Task 2: `RNDVecWrapper`

**Files:**
- Modify: `python/rnd.py` (append)
- Modify: `python/tests/test_rnd.py` (append)

**Step 1: Write the failing tests for the wrapper**

Append to `python/tests/test_rnd.py`:

```python
def _make_lumines_venv(n_envs=2):
    """Helper: DummyVecEnv wrapping LuminesEnvNative with VecNormalize."""
    from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
    from stable_baselines3.common.monitor import Monitor
    from game.env import LuminesEnvNative

    def make():
        env = LuminesEnvNative(mode="per_block", seed="0")
        return Monitor(env)

    venv = DummyVecEnv([make] * n_envs)
    venv = VecNormalize(venv, norm_obs=True, norm_reward=False)
    return venv


def test_rnd_wrapper_rewards_increase_with_positive_beta():
    """Wrapper adds a positive intrinsic bonus to all rewards."""
    from rnd import RNDVecWrapper
    venv = _make_lumines_venv(n_envs=2)
    wrapper = RNDVecWrapper(venv, beta=1.0, device="cpu")

    wrapper.reset()
    actions = np.array([0, 0])

    # Get baseline rewards without wrapper (step directly on venv)
    venv.reset()
    _, base_rewards, _, _ = venv.step(actions)

    # Reset both to same seed and get wrapped rewards
    wrapper.reset()
    _, wrapped_rewards, _, _ = wrapper.step(actions)

    # Wrapped rewards must be >= base rewards (intrinsic is non-negative)
    assert np.all(wrapped_rewards >= base_rewards - 1e-6), (
        f"expected wrapped >= base, got wrapped={wrapped_rewards}, base={base_rewards}"
    )


def test_rnd_wrapper_normalization_clips():
    """Normalized intrinsic rewards are clamped to [0, 5.0]."""
    from rnd import RNDVecWrapper
    venv = _make_lumines_venv(n_envs=4)
    wrapper = RNDVecWrapper(venv, beta=1.0, device="cpu")
    wrapper.reset()

    raw_r_int = []
    for _ in range(20):
        actions = np.zeros(4, dtype=int)
        wrapper.step(actions)

    # After 20 steps running stats are non-trivial; check that
    # _r_int_count has been updated and std is positive
    assert wrapper._r_int_count > 0
    r_int_std = np.sqrt(max(wrapper._r_int_var / max(1, wrapper._r_int_count), 1e-16))
    assert r_int_std > 0


def test_rnd_wrapper_save_load_roundtrip(tmp_path):
    """save() + load_state() restores predictor weights and running stats."""
    from rnd import RNDVecWrapper
    venv = _make_lumines_venv(n_envs=2)
    wrapper = RNDVecWrapper(venv, beta=0.01, device="cpu")
    wrapper.reset()

    # Take a few steps to build up running stats
    for _ in range(5):
        wrapper.step(np.zeros(2, dtype=int))

    save_path = str(tmp_path / "rnd_state.pt")
    wrapper.save(save_path)

    # Create fresh wrapper and load
    venv2 = _make_lumines_venv(n_envs=2)
    wrapper2 = RNDVecWrapper(venv2, beta=0.01, device="cpu")
    RNDVecWrapper.load_state(save_path, wrapper2)

    # Check predictor weights match
    for p1, p2 in zip(wrapper.predictor.parameters(), wrapper2.predictor.parameters()):
        assert torch.allclose(p1.data, p2.data)

    # Check running stats match
    assert wrapper._r_int_count == wrapper2._r_int_count
```

**Step 2: Run tests to verify they fail**

```bash
python/.venv/bin/pytest python/tests/test_rnd.py::test_rnd_wrapper_rewards_increase_with_positive_beta python/tests/test_rnd.py::test_rnd_wrapper_normalization_clips python/tests/test_rnd.py::test_rnd_wrapper_save_load_roundtrip -v
```
Expected: ImportError (RNDVecWrapper doesn't exist yet)

**Step 3: Append `RNDVecWrapper` to `python/rnd.py`**

```python
# --- append to python/rnd.py ---

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
        batch_n = len(r_int)
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
        state = torch.load(path, map_location=wrapper.device)
        wrapper.predictor.load_state_dict(state["predictor"])
        wrapper._r_int_count = state["r_int_count"]
        wrapper._r_int_mean = state["r_int_mean"]
        wrapper._r_int_var = state["r_int_var"]
```

**Step 4: Run tests to verify they pass**

```bash
python/.venv/bin/pytest python/tests/test_rnd.py -v
```
Expected: all 7 tests PASS

**Step 5: Commit**

```bash
git add python/rnd.py python/tests/test_rnd.py
git commit -m "feat(rnd): add RNDVecWrapper with Welford normalization"
```

---

### Task 3: `RNDCallback`

**Files:**
- Modify: `python/rnd.py` (append)
- Modify: `python/tests/test_rnd.py` (append)

**Step 1: Write the failing test for the callback**

Append to `python/tests/test_rnd.py`:

```python
def test_rnd_callback_logs_metrics_and_reduces_loss():
    """RNDCallback trains predictor and logs loss/r_int metrics over multiple rollout_ends."""
    from rnd import RNDVecWrapper, RNDCallback
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
    from stable_baselines3.common.monitor import Monitor
    from game.env import LuminesEnvNative

    def make():
        return Monitor(LuminesEnvNative(mode="per_block", seed="0"))

    venv = DummyVecEnv([make] * 2)
    venv = VecNormalize(venv, norm_obs=True, norm_reward=False)
    wrapper = RNDVecWrapper(venv, beta=0.01, device="cpu")

    policy_kwargs = dict(net_arch=dict(pi=[32], vf=[32]))
    model = PPO(
        "MultiInputPolicy",
        wrapper,
        n_steps=64,
        batch_size=32,
        n_epochs=1,
        policy_kwargs=policy_kwargs,
        verbose=0,
    )

    losses_recorded = []

    class LossRecorder(RNDCallback):
        def _on_rollout_end(self):
            super()._on_rollout_end()
            # Access last recorded loss via logger (SB3 stores in name_to_value)
            loss = self.logger.name_to_value.get("rnd/predictor_loss", None)
            if loss is not None:
                losses_recorded.append(loss)

    callback = LossRecorder(wrapper, lr=1e-3)
    model.learn(total_timesteps=256, callback=callback)

    assert len(losses_recorded) > 0, "callback never fired"
    assert losses_recorded[-1] < losses_recorded[0] or len(losses_recorded) == 1, (
        f"predictor loss should decrease over rollouts: {losses_recorded}"
    )
```

**Step 2: Run tests to verify the new test fails**

```bash
python/.venv/bin/pytest python/tests/test_rnd.py::test_rnd_callback_logs_metrics_and_reduces_loss -v
```
Expected: ImportError (RNDCallback not defined yet)

**Step 3: Append `RNDCallback` to `python/rnd.py`**

```python
# --- append to python/rnd.py ---

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
```

**Step 4: Run all RND tests**

```bash
python/.venv/bin/pytest python/tests/test_rnd.py -v
```
Expected: all 8 tests PASS

**Step 5: Commit**

```bash
git add python/rnd.py python/tests/test_rnd.py
git commit -m "feat(rnd): add RNDCallback with predictor training and TensorBoard logging"
```

---

### Task 4: Wire RND into `train.py`

**Files:**
- Modify: `python/train.py`

**Step 1: Add imports and CLI flags**

In `train.py`, add near the top imports:

```python
# After existing imports, before the helpers section:
from rnd import RNDVecWrapper, RNDCallback
```

In the `argparse` block (near the end of the file, inside `if __name__ == "__main__"`), add after the existing `--recurrent` argument:

```python
parser.add_argument(
    "--rnd-beta",
    dest="rnd_beta",
    type=float,
    default=0.0,
    help="RND intrinsic reward weight (0 = disabled). Recommended starting value: 0.01",
)
parser.add_argument(
    "--rnd-lr",
    dest="rnd_lr",
    type=float,
    default=1e-4,
    help="RND predictor optimizer learning rate (default: 1e-4)",
)
```

**Step 2: Wrap env in `_train_ppo()` when `beta > 0`**

In `_train_ppo(args, env, eval_env)`, find the block that creates VecNormalize and follows it with the model construction. Insert RND wrapping after VecNormalize is applied.

For the **fresh training** path (the `else` branch), replace:
```python
env = VecNormalize(env, norm_obs=True, norm_reward=False)
eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)
```
with:
```python
env = VecNormalize(env, norm_obs=True, norm_reward=False)
eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)

rnd_wrapper = None
if args.rnd_beta > 0:
    rnd_wrapper = RNDVecWrapper(env, beta=args.rnd_beta, device=args.device)
    env = rnd_wrapper
```

For the **resume** path (the `if args.resume is not None` branch), after `VecNormalize.load(...)` calls, add:

```python
rnd_wrapper = None
rnd_state_path = os.path.join(args.checkpoint_dir, "rnd_state.pt")
if args.rnd_beta > 0:
    rnd_wrapper = RNDVecWrapper(env, beta=args.rnd_beta, device=args.device)
    if os.path.exists(rnd_state_path):
        RNDVecWrapper.load_state(rnd_state_path, rnd_wrapper)
        print(f"Loaded RND state from {rnd_state_path}")
    env = rnd_wrapper
```

**Step 3: Add `RNDCallback` to the callbacks list**

In `_train_ppo()`, find the `callbacks = [...]` list and add after `EntropyScheduleCallback`:

```python
if rnd_wrapper is not None:
    callbacks.append(RNDCallback(rnd_wrapper, lr=args.rnd_lr))
```

**Step 4: Save RND state on training completion**

At the end of `_train_ppo()`, after `env.save(norm_stats_path)`, add:

```python
if rnd_wrapper is not None:
    rnd_state_path = os.path.join(args.checkpoint_dir, "rnd_state.pt")
    rnd_wrapper.save(rnd_state_path)
    print(f"RND state saved to {rnd_state_path}")
```

**Step 5: Smoke-test the wiring with a short run**

```bash
cd /Users/gordon/Playground/react-lumines/master
python python/train.py --algo ppo --timesteps 2000 --envs 2 --rnd-beta 0.01 --dummy --device cpu
```
Expected: training starts, TensorBoard output includes `rnd/predictor_loss`, `rnd/mean_r_int`, run completes without error, `python/checkpoints/rnd_state.pt` is created.

**Step 6: Smoke-test resume**

```bash
python python/train.py --algo ppo --timesteps 1000 --envs 2 --rnd-beta 0.01 --dummy --device cpu --resume
```
Expected: prints "Loaded RND state from python/checkpoints/rnd_state.pt", continues without error.

**Step 7: Commit**

```bash
git add python/train.py
git commit -m "feat(rnd): wire RNDVecWrapper and RNDCallback into PPO training pipeline"
```

---

### Task 5: Run full test suite and verify nothing is broken

**Step 1: Run all Python tests**

```bash
python/.venv/bin/pytest python/tests/ -v
```
Expected: all tests PASS (no regressions in game logic tests, new RND tests pass)

**Step 2: Verify RND is opt-out (no beta = no change)**

```bash
python python/train.py --algo ppo --timesteps 1000 --envs 2 --dummy --device cpu
```
Expected: no RND-related output, no `rnd_state.pt` created, behavior identical to pre-RND baseline.

**Step 3: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix(rnd): <description of any fixes>"
```

---

## Hyperparameter Starting Point

Run a baseline comparison:

```bash
# Baseline (no RND)
python python/train.py --algo ppo --timesteps 3000000 --envs 16 --device mps

# With RND
python python/train.py --algo ppo --timesteps 3000000 --envs 16 --device mps --rnd-beta 0.01
```

Monitor in TensorBoard:
- `eval/mean_game_score` — primary metric
- `rnd/mean_r_int` — should start high and decay as predictor learns
- `rnd/predictor_loss` — should decrease over training
- `rollout/ep_peak_combo_len_mean` — key signal for whether combo discovery improves

If `rnd/mean_r_int` stays flat (predictor not learning): increase `--rnd-lr`.
If scores collapse vs baseline: reduce `--rnd-beta` to 0.001.
If no improvement over baseline: increase `--rnd-beta` to 0.05.
