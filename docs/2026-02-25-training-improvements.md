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
| 6 | `n_steps=4096 × 8 envs = 32,768` → 512 gradient steps/rollout; `placement_penalty=0.30` creates consistent signal; all 512 steps push same direction → logits → +∞ in one rollout | `approx_kl=96.72` at 50k, `entropy_loss≈0` at 98k, training frozen (`n_updates=12` at 100k) |
| 7 | Linear LR decay `lr * progress` → LR≈0 by end of training; entropy gradient step ≈ 0; policy concentrates gradually across 1894 updates, each below target_kl=0.01 threshold | `entropy_loss=0`, `approx_kl=0`, `eval/mean_ep_length=6` at 2M steps; `explained_variance=0.998` (value learned deterministic trajectory) |

---

## Fixes

### Action Space

```python
# Before — x=15 clamped to x=14, doubling its probability
self.action_space = spaces.Discrete(64)  # 16 cols × 4 rotations

# After — uniform probability across all columns
self.action_space = spaces.Discrete(60)  # 15 cols × 4 rotations (x=0..14)
```

### Reward Formula (iteration 4–6)

Iteration 4–5 used `placement_penalty` to discourage tall columns:

```python
placement_penalty = placed_col_height / BOARD_HEIGHT * 0.30
reward = score_delta + squares_delta * 0.5 + 0.1 - placement_penalty  # iter 4–5
```

**Iteration 6 removed `placement_penalty`** — it created a consistent gradient every rollout that collapsed the policy to determinism even with reduced `n_steps`:

```python
if done:
    reward = score_delta - 1.0
else:
    reward = score_delta + squares_delta * 0.5 + 0.1
```

### Hyperparameter History

| Hyperparameter | Iter 1 | Iter 2 | Iter 3 | Iter 4 | Iter 5 | Iter 6 | Iter 7 |
|---|---|---|---|---|---|---|---|
| `action_space` | Discrete(64) | Discrete(60) | ← | ← | ← | ← | ← |
| `ent_coef` | 0.1 | 0.1 | 0.3 | **0.05** | ← | **0.1** | **0.2** |
| `n_steps` | 2048 | 4096 | ← | ← | ← | **512** | ← |
| `n_epochs` | 10 | 10 | 10 | **4** | ← | ← | ← |
| `learning_rate` | 3×10⁻⁴ const | linear decay | ← | ← | ← | ← | **3×10⁻⁴ const** |
| `target_kl` | 0.02 | ← | ← | ← | **removed** | **0.01** | ← |
| `clip_range` | 0.2 | ← | ← | ← | **0.1** | ← | ← |
| height penalty coef | 0.1 → 0.05 | 0.05 | removed | — | — | — | — |
| placement penalty coef | — | — | 0.15 | **0.30** | ← | **removed** | — |
| squares_delta weight | — | 0.5 | ← | ← | ← | ← | ← |

---

## Iteration 6 Results (98k steps)

Both fixes together resolved the collapse:

| Metric | Iter 5 (collapsed) | Iter 6 @ 98k |
|--------|-------------------|--------------|
| `ep_len_mean` | 6 | **57.6** |
| `entropy_loss` | ≈0 | **−0.66** |
| `approx_kl` | 0.0 | **0.013** |
| `clip_fraction` | 0% | **4.1%** |
| `policy_gradient_loss` | ≈0 | **0.0045** |
| `n_updates` | 12 at 100k | 23 at 98k |

Policy is still exploring (entropy maintained), gradient is flowing, and ep_len is 10× longer.
`explained_variance=0.001` is low — value function still bootstrapping — but this is expected early in training.

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
