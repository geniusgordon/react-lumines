# Lumines RL Agent — Architecture & Usage

**Date:** 2026-02-24 (updated 2026-02-26)
**Status:** Implemented
**Files:** `python/train.py`, `python/eval.py`, `python/game/env.py`

---

## 1. Overview

A PPO-based reinforcement learning agent trained to play Lumines. The agent operates in `per_block` mode: one action per block placement, choosing a target column (0–14) and rotation (0–3) as a single `Discrete(60)` action.

Training uses [Stable-Baselines3](https://stable-baselines3.readthedocs.io/) with the pure-Python `LuminesEnvNative` gymnasium environment (`python/game/env.py`) — no Node.js subprocess required.

---

## 1a. Timeline Sweep in Per-Block Mode

### Problem

In real Lumines a player places 5–8 blocks per full timeline sweep. The timeline advances continuously while the player is thinking and placing. The RL environment must simulate this pacing so the agent learns to build patterns *ahead of* the sweep and chain combos — not just clear immediately on every placement.

### Solution: `blocks_per_sweep`

After every hard drop, `_step_per_block` runs `ticks_per_block` timeline ticks:

```python
ticks_per_block = (BOARD_WIDTH * TIMELINE_SWEEP_INTERVAL) // blocks_per_sweep
#               = (16 × 15) // 6 = 40  (default)
```

Each tick increments `frame`, decrements `game_timer`, re-detects patterns, and calls `update_timeline`. The timeline advances ~2–3 columns per block at the default setting, completing a full board pass every ~6 placements — matching real gameplay pacing.

| `blocks_per_sweep` | `ticks_per_block` | Cols/step | Full sweep every |
|--------------------|-------------------|-----------|-----------------|
| 1 | 240 | 16 | 1 block |
| 6 (default) | 40 | ~2–3 | ~6 blocks |
| 16 | 15 | 1 | 16 blocks |

Falling columns from clears are settled instantly at the end of the step (no animation ticks), so the observation always reflects the fully resolved board.

### Why not instant clear?

Clearing everything immediately on each placement would prevent the agent from learning combo strategies — the core skill in Lumines. With `blocks_per_sweep=6` the sweep progresses naturally and the agent must plan 2–3 blocks ahead to chain patterns.

---

## 2. Neural Network Architecture

A two-branch `LuminesCNNExtractor` feeds into SB3's `MultiInputPolicy`.

```
Observation (Dict)
 ├── board (10×16 int8) ──────────── CNN branch
 │                                      Conv2d(1→16, 3×3, pad=1) → ReLU
 │                                      Conv2d(16→32, 3×3, pad=1) → ReLU
 │                                      Flatten → Linear(→64) → ReLU
 │                                                               │
 ├── current_block (2×2) ──────┐                                 │
 ├── queue (2×2×2)  ───────────┤  MLP branch                    │
 ├── block_position (2,) ──────┤  concat → Linear(16→64) → ReLU │
 ├── timeline_x (1,)  ─────────┤                                 │
 └── game_timer (1,)  ─────────┘                                 │
                                                                  │
                        128-dim concat ←──────────────────────────
                               │
                    PPO actor head + critic head
                    net_arch=dict(pi=[128,128], vf=[128,128])
```

**MLP input size:** 4 + 8 + 2 + 1 + 1 = 16 values.
**Combined output:** 128 dimensions (64 from each branch).

`score` and `frame` are excluded from the network inputs — they leak non-stationary scale information and are better left to the value baseline learned implicitly from returns.

---

## 3. Training Configuration

| Hyperparameter | Value |
|---------------|-------|
| Algorithm | PPO |
| Policy | `MultiInputPolicy` |
| Parallel envs | 8 (`SubprocVecEnv`) |
| `n_steps` | 512 per env (4 096 total per rollout) |
| `batch_size` | 256 |
| `n_epochs` | 10 |
| `gae_lambda` | 0.95 |
| `ent_coef` | 0.01 |
| `vf_coef` | 0.5 |
| `clip_range` | 0.2 |
| `max_grad_norm` | 0.5 |
| Learning rate | 3×10⁻⁴ constant |
| Device | `mps` (Apple Silicon) |
| Total timesteps | 2 000 000 |
| Obs/reward normalisation | `VecNormalize(norm_obs=True, norm_reward=True)` |
| Checkpoint frequency | Every 50 000 steps |
| Eval frequency | Every 50 000 steps (5 episodes) |

### Why `VecNormalize`?

PPO's value function benefits from normalised observations and rewards. Norm stats are saved alongside checkpoints as `vecnormalize.pkl` and restored on resume/eval.

---

## 4. Reward Function

The reward is designed around Lumines' core scoring mechanic: the timeline
sweeps left-to-right, accumulating `holding_score` while passing over
consecutive columns of same-color 2×2 patterns, then cashing out on the first
empty column. Longer *chains* of consecutive pattern columns → bigger payouts.

```python
# alive:
reward = score_delta + chain_delta * 0.3 + color_adj * 0.1 + height_reward
# game over:
reward = score_delta - 1.0 + height_reward

height_reward = -(sum_of_all_column_heights / 160) * 0.2   # range: [-0.2, 0]
```

| Component | Range | Purpose |
|-----------|-------|---------|
| `score_delta` | ≥ 0 | Actual game score from timeline sweeps (primary objective) |
| `chain_delta × 0.3` | varies | Change in longest run of consecutive columns with a 2×2 pattern; directly rewards the combo strategy |
| `color_adj × 0.1` | ≥ 0 | External same-color neighbors of placed cells in the pre-drop board; encourages consolidating colors for future chains |
| `height_reward` | −0.2 … 0 | Aggregate board fullness penalty; accounts for every column, not just the placement column |
| `death_penalty` | −1.0 | Penalise game over |

No flat survival bonus — the agent's incentive to survive comes from future
scoring opportunities.

`squares_delta` is tracked in `reward_components` for logging but is not
included in the formula (its sign is unreliable when the timeline clears
patterns within the same step).

---

## 5. File Reference

| File | Purpose |
|------|---------|
| `python/train.py` | Training entry point — `--algo ppo\|dqn`, builds envs, runs training |
| `python/eval.py` | Evaluation — loads a checkpoint, runs episodes, reports scores, optional ASCII render |
| `python/game/env.py` | Pure-Python gymnasium environment (`LuminesEnvNative`) |
| `python/game/` | Pure-Python game logic (board, blocks, physics, timeline, etc.) |
| `python/checkpoints/` | Saved model checkpoints (generated at runtime) |
| `python/logs/` | TensorBoard event files (generated at runtime) |

---

## 6. Training

```bash
# PPO (default algo)
python python/train.py --algo ppo

# Custom run
python python/train.py --algo ppo \
  --timesteps 2000000 \
  --envs 8 \
  --device mps

# Resume from best checkpoint
python python/train.py --algo ppo --resume

# DQN (alternative)
python python/train.py --algo dqn
```

PPO checkpoints: `python/checkpoints/lumines_ppo_<N>_steps.zip`
Best PPO model: `python/checkpoints/best_model_ppo.zip`
VecNormalize stats: `python/checkpoints/vecnormalize.pkl`

### Monitoring

```bash
tensorboard --logdir python/logs
```

Key metrics to watch:
- `rollout/ep_rew_mean` — mean episode reward (should trend upward)
- `rollout/ep_len_mean` — episode length (longer = agent surviving better)
- `train/entropy_loss` — must stay noticeably negative; collapse to ~0 = policy collapse
- `train/approx_kl` — should stay below ~0.02; spikes indicate instability
- `train/explained_variance` — positive and trending toward 1.0

---

## 7. Evaluation

```bash
# Basic: 10 episodes, print mean/max/min score
python python/eval.py --algo ppo --checkpoint python/checkpoints/best_model_ppo

# Watch the agent play (ASCII board, 100ms between steps)
python python/eval.py --algo ppo \
  --checkpoint python/checkpoints/best_model_ppo \
  --render --episodes 3 --delay 0.1
```

Eval automatically loads `vecnormalize.pkl` from the checkpoint directory when `--algo ppo`.
