# Training Improvements — Action Space Fix, Reward Shaping & Hyperparameter Tuning

**Date:** 2026-02-25
**Status:** Implemented
**Files:** `python/game/env.py`, `python/train.py`

---

## Root Causes (Iterations 1–4)

| Iteration | Root Cause | Symptom |
|-----------|-----------|---------|
| 1 | `Discrete(64)` gave x=14 double probability (actions 60–63 all clamp to x=14) | Policy collapses to column 14, ep_len=6 |
| 1 | `ent_coef=0.0` — no entropy regularisation | Immediate deterministic collapse |
| 1 | Reward = pure score delta; timeline barely moves in 6 steps | ep_rew_mean=0, no gradient |
| 2 | `score_delta==0` throughout; 2×2 square formation is deeply delayed | ep_rew_mean plateaus at −1.3, agent survives but never clears |
| 3 | `height_penalty` is global — no directional gradient distinguishing tall vs short columns | Stochastic ep_len≈52, deterministic eval ep_len≈6 (entropy masks collapse) |
| 4 | `ent_coef=0.3` dominates gradient (0.60/step vs 0.10 survival, 0.15 max penalty) | Entropy drives rollout, value function collapses (`explained_variance`=−1.4×10⁻³) |
| 5 | `target_kl=0.02` stops every rollout at step 0 (first mini-batch); `ent_coef=0.05` concentrated policy fast → KL=2.15 on step 0 | `n_updates=4` after 150k steps; 512× fewer gradient steps than intended; training frozen |

---

## Fixes

### Action Space

```python
# Before — x=15 clamped to x=14, doubling its probability
self.action_space = spaces.Discrete(64)  # 16 cols × 4 rotations

# After — uniform probability across all columns
self.action_space = spaces.Discrete(60)  # 15 cols × 4 rotations (x=0..14)
```

### Reward Formula (final, iteration 4)

```python
actual_x = self._state.block_position_x  # captured before hard drop
self._state = hard_drop(self._state, rng)
placed_col_height = self._column_heights()[actual_x]
placement_penalty = placed_col_height / BOARD_HEIGHT * 0.30
squares_delta = float(self._count_complete_squares() - prev_squares)

if done:
    reward = score_delta - 1.0
else:
    reward = score_delta + squares_delta * 0.5 + 0.1 - placement_penalty
```

| Column height | Penalty | Net step reward |
|---|---|---|
| height 2 (fresh) | 0.06 | +0.04 |
| height 5 (mid)   | 0.15 | −0.05 |
| height 8 (full)  | 0.24 | −0.14 |

### Hyperparameter History

| Hyperparameter | Iter 1 | Iter 2 | Iter 3 | Iter 4 | Iter 5 |
|---|---|---|---|---|---|
| `action_space` | Discrete(64) | Discrete(60) | ← | ← | ← |
| `ent_coef` | 0.1 | 0.1 | 0.3 | **0.05** | ← |
| `n_steps` | 2048 | 4096 | ← | ← | ← |
| `n_epochs` | 10 | 10 | 10 | **4** | ← |
| `learning_rate` | 3×10⁻⁴ const | linear decay | ← | ← | ← |
| `target_kl` | 0.02 | ← | ← | ← | **removed** |
| `clip_range` | 0.2 | ← | ← | ← | **0.1** |
| height penalty coef | 0.1 → 0.05 | 0.05 | removed | — | — |
| placement penalty coef | — | — | 0.15 | **0.30** | ← |
| squares_delta weight | — | 0.5 | ← | ← | ← |

---

## Key Diagnostic: Eval/Rollout Gap

If `eval/mean_ep_length ≈ 6` while `rollout/ep_len_mean ≈ 80+`, the policy has NOT internalised column distribution — it's relying on entropy to survive. The gap must close.

| TensorBoard Metric | Healthy Sign |
|---|---|
| `rollout/ep_len_mean` | Growing well past 6, trending up |
| `rollout/ep_rew_mean` | Trending positive |
| `eval/mean_ep_length` | Closing gap with rollout |
| `train/entropy_loss` | Noticeably negative; must not collapse to ~0 |
| `train/explained_variance` | Positive and near 1.0 |

---

## Remaining Limitations

- **Score is still sparse.** `squares_delta` rewards pattern formation but actual scoring requires the timeline to sweep over marked cells.
- **squares_delta can go negative** when the timeline clears previously counted squares — monitor net reward carefully.
- **Timeline position not exploited.** `timeline_x` is in the observation but no shaped reward guides placement ahead of the sweep.
