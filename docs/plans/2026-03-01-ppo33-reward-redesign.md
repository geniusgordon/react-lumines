# PPO_33: Reward Redesign — Potential-Based Shaping

**Date:** 2026-03-01

## Overview

PPO_33 replaces the previous multi-term hand-shaped reward with one potential-based
shaping term added to `score_delta`. The goal is to keep score as the objective while
providing dense, strategy-aligned gradients.

## Final Reward Formula

```python
reward = score_delta
       + SHAPING_LAMBDA * (SHAPING_GAMMA * phi_next - phi_prev)
       + death
```

`phi` is computed on the post-clear simulated board:

```python
phi = (
    1.0 * chain_max
    + 0.6 * purity
    - 0.8 * blockers
    - 0.3 * height
    + 0.2 * setup
)
```

Where all features are normalized to `[0, 1]`.

---

## Changes

### `python/game/env.py`

| What | Details |
|------|---------|
| `_compute_potential(board)` | Calculates `phi` plus normalized feature components |
| `_max_column_height_from_board(board)` | Tallest-column helper for potential term |
| `_prev_phi` | State tracking for potential delta |
| Reward formula | `score_delta + shaping_reward + death` |
| `info["reward_components"]` | `score_delta`, `phi_prev`, `phi_next`, `potential_delta`, `shaping_reward`, `chain_max`, `purity`, `blockers`, `height`, `setup`, `death`, `total` |

### `python/train.py`

- `MLP_KEYS`: `dominant_color_chain` → `light_chain`, `dark_chain`

### `python/STRATEGY.md`

- Updated to potential-based reward equation, feature set, and tuning guidance

### Tests

- Updated to potential-based keys and formula checks (`score_delta + shaping_reward + death`)

## Design Notes

- No CNN architecture change — 4 channels unchanged.
- MLP input: `dominant_color_chain` (1) → `light_chain` + `dark_chain` (2), so MLP input grows 20 → 21. `train.py` computes this dynamically; docstring updated.
- Reward-components schema changed from old 7-term shaping to potential features.

## Verification

```bash
python/.venv/bin/pytest python/tests/ -v
python python/train.py --algo ppo --timesteps 5000 --envs 2 --dummy
```
