# PPO Training Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix PPO training instability and improve game score by correcting hyperparameters and scaling the death penalty.

**Architecture:** Two targeted edits — PPO constructor args in `train.py` and the death penalty constant in `env.py`. No structural changes to the network, observation space, or reward formula beyond the death penalty magnitude.

**Tech Stack:** Python, Stable-Baselines3, Gymnasium, PyTorch

**Design doc:** `docs/plans/2026-02-26-ppo-training-improvement-design.md`

---

### Task 1: Fix PPO Hyperparameters in train.py

**Files:**
- Modify: `python/train.py:226-243` (the `PPO(...)` constructor inside `_train_ppo`)

**Context:** The current settings produce `clip_fraction=0.66` and `approx_kl=0.23`, both far above healthy targets. The fix is five parameter changes inside the existing `PPO(...)` call.

**Step 1: Open and read the current PPO constructor**

In `python/train.py`, find `_train_ppo`. The `PPO(...)` call currently looks like:

```python
model = PPO(
    "MultiInputPolicy",
    env,
    learning_rate=3e-4,
    n_steps=512,
    batch_size=256,
    n_epochs=10,
    gamma=0.99,
    gae_lambda=0.95,
    clip_range=0.2,
    ent_coef=0.01,
    vf_coef=0.5,
    max_grad_norm=0.5,
    policy_kwargs=policy_kwargs,
    tensorboard_log=args.log_dir,
    device=args.device,
    verbose=1,
)
```

**Step 2: Apply the five changes**

Replace the PPO constructor with:

```python
model = PPO(
    "MultiInputPolicy",
    env,
    learning_rate=1e-4,
    n_steps=1024,
    batch_size=256,
    n_epochs=4,
    gamma=0.99,
    gae_lambda=0.95,
    clip_range=0.2,
    ent_coef=0.05,
    vf_coef=0.5,
    max_grad_norm=0.5,
    target_kl=0.02,
    policy_kwargs=policy_kwargs,
    tensorboard_log=args.log_dir,
    device=args.device,
    verbose=1,
)
```

Changes summary:
- `learning_rate`: `3e-4` → `1e-4`
- `n_steps`: `512` → `1024`
- `n_epochs`: `10` → `4`
- `ent_coef`: `0.01` → `0.05`
- `target_kl`: _(new)_ `0.02`

**Step 3: Smoke-test that the module parses without error**

```bash
python -c "import sys; sys.path.insert(0, 'python'); import train; print('OK')"
```

Expected output: `OK`

**Step 4: Commit**

```bash
git add python/train.py
git commit -m "fix: tune PPO hyperparameters to fix clip_fraction and KL divergence"
```

---

### Task 2: Scale Death Penalty in env.py

**Files:**
- Modify: `python/game/env.py:264-268` (the reward calculation at end of `_step_per_block`)

**Context:** The current `-1.0` death penalty is indistinguishable from noise on a bad placement. Scaling it to `-10.0` makes dying extremely costly without adding any survival bonus (which would reward timid play).

**Step 1: Locate the reward lines in `_step_per_block`**

Near the end of `_step_per_block`, find:

```python
        done = self._state.status == "gameOver"
        if done:
            reward = score_delta - 1.0 + height_reward
        else:
            reward = score_delta + chain_delta * 0.3 + color_adj * 0.1 + height_reward
        info = self._build_info()
        info["reward_components"] = {
            ...
            "death_penalty": -1.0 if done else 0.0,
            ...
        }
```

**Step 2: Apply the change**

Replace with:

```python
        done = self._state.status == "gameOver"
        if done:
            reward = score_delta - 10.0 + height_reward
        else:
            reward = score_delta + chain_delta * 0.3 + color_adj * 0.1 + height_reward
        info = self._build_info()
        info["reward_components"] = {
            ...
            "death_penalty": -10.0 if done else 0.0,
            ...
        }
```

**Step 3: Run the existing test suite to confirm nothing broke**

```bash
python/.venv/bin/pytest python/tests/ -v
```

Expected: all tests pass. If any test asserts `death_penalty == -1.0` exactly, update that assertion to `-10.0`.

**Step 4: Commit**

```bash
git add python/game/env.py
git commit -m "fix: scale death penalty from -1.0 to -10.0 to discourage early game over"
```

---

### Task 3: Verify with a Short Training Run

**Goal:** Confirm the changes produce healthy PPO metrics without running a full 2M-step job.

**Step 1: Delete old logs so inspect_logs.py picks up a fresh run**

```bash
rm -rf python/logs/PPO_2   # or whichever next index SB3 will use
```

Check what index SB3 will assign:
```bash
ls python/logs/
```

**Step 2: Launch a short training run (100k steps, 4 envs)**

```bash
python python/train.py --algo ppo --timesteps 100000 --envs 4 --device mps
```

This should finish in a few minutes. Watch stdout for the SB3 progress table.

**Step 3: Inspect the logs**

```bash
python python/inspect_logs.py
```

Check the HEALTH ASSESSMENT section. After 100k steps, target:

- `clip_fraction` < 0.3 (was 0.66 — won't fully converge in 100k but should drop)
- `approx_kl` < 0.1 (was 0.23)
- `Entropy loss` more negative than `-2.3` (entropy should be higher now)
- `ep_len_mean` trending upward vs the baseline ~27

**Step 4: If metrics look healthier, commit a note and kick off the full run**

```bash
git commit --allow-empty -m "chore: verified PPO fix metrics improved, starting full 2M training run"

python python/train.py --algo ppo --timesteps 2000000 --envs 8 --device mps
```
