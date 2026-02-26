# Reward Function Redesign — Run 3

**Date:** 2026-02-26
**Status:** Implemented

---

## Context

After two PPO training runs (~540k and ~410k steps respectively), `explained_variance`
never exceeded 0.1 despite a larger critic network (`vf=[512,512,256]`) and
`vf_coef=2.0`. The critic consistently failed to model the value landscape, limiting
policy improvement.

### Run history

| Run | Steps | Best eval reward | Clip fraction | Explained variance |
|-----|-------|-----------------|---------------|-------------------|
| 1 | 540k | 3.45 | 0.14 | 0.10 |
| 2 | 410k | 5.00 | 0.45 → 0.33 | 0.08 |

Run 2 achieved a better eval peak (5.0) but was destabilised by a too-high initial
LR (`3e-4` instead of `1e-4`), producing `clip_fraction=0.45`. Even after correction
the critic never recovered.

---

## Root Cause Analysis

The absolute `height_reward` formula:

```python
height_reward = -(sum_of_all_column_heights / 160) * 0.5  # always ≤ 0
```

produced a **large constant negative bias** on every step regardless of what the
agent did. On a half-full board every step carries `≈ −0.25` from height alone,
completely unrelated to the action taken. The critic must predict the sum of future
such values — a moving target that shifts as the board fills, making it harder to
explain variance due to *policy choices* vs variance due to *board state baseline*.

`color_adj * 0.1` added further noise: values 0–0.8 per step, correlated with board
state but not directly with the scoring mechanic.

---

## Changes

### `python/game/env.py`

**Replace absolute height with potential-based height delta:**

```python
# Before
aggregate_height = sum(self._column_heights())          # pre-drop
height_reward = -aggregate_height / (BOARD_HEIGHT * BOARD_WIDTH) * 0.5

reward = score_delta + chain_delta * 0.3 + color_adj * 0.1 + height_reward

# After
prev_aggregate_height = sum(self._column_heights())     # pre-drop
# ... hard_drop + timeline advance ...
height_delta = -(sum(self._column_heights()) - prev_aggregate_height) / (BOARD_HEIGHT * BOARD_WIDTH) * 0.5

reward = score_delta + squares_delta * 0.2 + chain_delta * 0.3 + height_delta
```

**Add `squares_delta * 0.2` to the formula:**

`squares_delta` was already computed for logging. Adding it to the reward gives
dense per-step feedback for creating 2×2 same-color patterns — the prerequisite
for all scoring. When the timeline sweeps and clears patterns, `squares_delta` goes
negative, but this is simultaneously offset by a positive `score_delta`.

**Remove `color_adj * 0.1`:**

Color adjacency is a prerequisite of pattern creation, which is already rewarded by
`squares_delta`. The term was redundant and added small-magnitude noise (0–0.8)
that the critic had to account for without additional information content.

### `python/train.py` (no changes in this iteration)

Hyperparameters from the previous fix remain:
- `n_steps=2048`, `n_epochs=6`, `vf_coef=2.0`, `LR=1e-4→1e-5`

---

## Reward Component Summary

| Component | Range (approx) | Purpose |
|-----------|---------------|---------|
| `score_delta` | ≥ 0 | Game score from timeline sweeps (primary objective) |
| `squares_delta × 0.2` | varies | Pattern creation (requires color matching); cleared by timeline → negative, offset by `score_delta` |
| `chain_delta × 0.3` | varies | Combo chain extension (core Lumines strategy) |
| `height_delta` | ≈ −0.01 to +0.05 | Potential-based board pressure; zero on stable boards |
| `death_penalty` | −3.0 or 0 | Game-over penalty |

### Why `squares_delta` + `chain_delta` replaces `color_adj`

The color-matching strategy emerges implicitly:
- `squares_delta > 0` requires placing same-color cells to form a 2×2 pattern
- `chain_delta > 0` requires adjacent same-color patterns across columns
- `color_adj` was rewarding the *input* to these two outcomes — redundant once the
  outcomes themselves are directly rewarded

---

## Expected Impact

| Metric | Previous | Expected |
|--------|----------|----------|
| `explained_variance` | 0.08–0.10 | > 0.3 (critic has cleaner signal) |
| `clip_fraction` | 0.14–0.33 | < 0.15 (hyperparams already fixed) |
| `ep_len_mean` | ~25–27 | > 30 (better value estimates → better policy) |
| `eval/mean_reward` | ~5.0 peak | Higher and more stable |

---

## Files Changed

- `python/game/env.py` — reward formula, removed `_color_adjacency_score` method
- `python/tests/test_env_rewards.py` — updated height tests, removed color_adjacency tests
- `python/tests/test_action_sequence.py` — updated height assertions
- `docs/2026-02-24-rl-agent-design.md` — sections 2, 3, 4 updated
