# PPO_22 LR Schedule Tuning — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stabilise the late-training decay seen in PPO_17/18/21 by pushing the LR floor down 10× and tightening `target_kl` slightly, giving the policy a chance to hold its peak rather than sliding after ~1.2M steps.

**Architecture:** Single-file change to `python/train.py`: swap `linear_schedule(3e-5, 1e-6)` for `linear_schedule(3e-5, 1e-7)` and lower `target_kl` from `0.01` to `0.008`. Everything else (architecture, reward, observations) is identical to PPO_21 so any delta is attributable to the LR schedule alone.

**Tech Stack:** Python 3, Stable-Baselines3, pytest. Run tests with `python/.venv/bin/pytest`.

---

## Context

### The problem

Across PPO_17, PPO_18, and PPO_21, eval reward peaks early (1.0–1.5M steps) then softly declines:

| Run | Peak eval | At step | Final eval |
|-----|-----------|---------|------------|
| PPO_17 | 24.17 | ~1.6M | ~22 |
| PPO_21 | 20.00 | ~1.2M | ~13.3 |

Clip fraction drifts upward (0.10 → 0.15) in the second half, indicating updates are still large when the policy should be fine-tuning. The LR floor of `1e-6` is not low enough to brake updates at peak skill.

### The fix

- **LR floor**: `1e-6` → `1e-7` (10× lower). Linear decay from `3e-5` means the floor is reached at the same relative schedule point, but updates are 10× smaller in the final third of training.
- **`target_kl`**: `0.01` → `0.008`. Early-stops PPO update epochs when KL exceeds 0.008, preventing over-update at high skill.
- **Entropy schedule**: unchanged (`0.1 → 0.03`). Exploration was healthy in PPO_21.

### Key files

- `python/train.py` — all hyperparameters for PPO live in `_train_ppo` (lines 265–283) and the `EntropyScheduleCallback` instantiation (line 302).
- `python/tests/test_train_config.py` — structural tests for the PPO config (may need updating if it hardcodes current values).
- `python/logs/` — TensorBoard logs; PPO_22 will create `python/logs/PPO_22/`.

### Run all tests

```bash
python/.venv/bin/pytest python/tests/ -v
```

### Inspect training progress

```bash
python python/inspect_logs.py python/logs/PPO_22
```

---

## Task 1: Check for existing config tests and update them

**Files:**
- Read: `python/tests/test_train_config.py` (if it exists)

**Step 1: Check if a config test file exists**

```bash
ls python/tests/test_train_config.py 2>/dev/null && echo EXISTS || echo MISSING
```

**Step 2: If it exists, read it**

```bash
python/.venv/bin/pytest python/tests/test_train_config.py -v
```

Look for any test that hardcodes `1e-6` (the old LR floor) or `0.01` (the old `target_kl`). If found, note the line numbers — you'll update them in Task 2 after changing `train.py`.

If the file is MISSING, skip to Task 2.

---

## Task 2: Update hyperparameters in train.py

**Files:**
- Modify: `python/train.py` (lines 268 and 278)

**Step 1: Change the LR floor**

Find:
```python
            learning_rate=linear_schedule(3e-5, 1e-6),
```

Replace with:
```python
            learning_rate=linear_schedule(3e-5, 1e-7),
```

**Step 2: Tighten target_kl**

Find:
```python
            target_kl=0.01,
```

Replace with:
```python
            target_kl=0.008,
```

**Step 3: Verify the diff looks right**

```bash
git diff python/train.py
```

Expected: exactly two lines changed — `1e-6` → `1e-7` and `0.01` → `0.008`. Nothing else.

**Step 4: If test_train_config.py exists and hardcodes old values, update those now**

Change any `1e-6` → `1e-7` and `0.01` → `0.008` in the test file to match.

**Step 5: Run full test suite**

```bash
python/.venv/bin/pytest python/tests/ -v
```

Expected: all passing (same count as before — currently 111 passed, 1 skipped).

**Step 6: Commit**

```bash
git add python/train.py
git commit -m "feat(ppo22): lower LR floor to 1e-7 and target_kl to 0.008 for late-training stability"
```

---

## Task 3: Launch PPO_22 training

**Step 1: Start training**

```bash
python python/train.py --algo ppo --timesteps 3000000 --envs 8 --device mps
```

This will create `python/logs/PPO_22/`. The run name increments automatically based on the TensorBoard log directory numbering.

**Step 2: Confirm the new log directory appeared**

```bash
ls python/logs/ | sort -V | tail -3
```

Expected: `PPO_22` is present.

**Step 3: Commit the launch**

```bash
git commit --allow-empty -m "feat(ppo22): launch PPO_22 training with LR floor 1e-7 and target_kl 0.008"
```

---

## Task 4: Early health check at ~500k steps

**Step 1: Inspect logs**

```bash
python python/inspect_logs.py python/logs/PPO_22
```

**Step 2: Evaluate against PPO_21 baseline**

Compare these metrics at the same step count:

| Metric | PPO_21 @ 600k | PPO_22 target |
|--------|---------------|---------------|
| eval/mean_reward | 15.13 | ≥ 15 |
| Clip fraction | 0.122 | ≤ 0.12 (should be tighter) |
| Explained variance | 0.724 | ≥ 0.65 |
| Approx KL | 0.011 | ≤ 0.008 (hits target_kl earlier) |

**Step 3: If clip fraction is already above 0.15 at 500k**

That would mean the LR schedule is still too aggressive. Flag this for review — do not adjust automatically.

**Step 4: If KL is consistently hitting the 0.008 ceiling (approx_kl ≈ 0.008 every update)**

That means `target_kl` is too tight and epochs are being cut short. Flag for review.

---

## Success criteria

PPO_22 is a success if, at 1.5M steps:
- `eval/mean_reward` is still within 10% of its peak (does not decay >10% from peak)
- Clip fraction stays below 0.13 in the second half of training
- Explained variance holds above 0.65

If eval reward peaks above PPO_21's 20.0 and holds, this is the stable baseline for architecture experiments.
