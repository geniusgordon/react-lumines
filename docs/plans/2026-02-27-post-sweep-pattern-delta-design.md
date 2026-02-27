# Post-Sweep Pattern Delta Reward — Design

**Date:** 2026-02-27
**Motivation:** PPO_20 learned to build and sweep combos but leaves a messy board
afterward. The agent has no incentive to consider residual board quality after a
sweep — it optimizes for the chain, then ignores what's left behind.

---

## Problem

After a sweep clears marked cells, the remaining board is often a mix of
isolated cells and color-alternating columns that can never form new 2×2
patterns. The agent isn't penalized for this and has no reason to prefer
placements that leave a combinable residual.

---

## Design

### New reward term: `post_sweep_pattern_delta`

Fires only when a sweep actually occurred during the tick loop (`score_delta > 0`).

```
post_sweep_pattern_delta_reward = (post_tick_patterns - pre_tick_patterns) * WEIGHT
```

- `pre_tick_patterns` = `_count_complete_squares()` immediately after the hard
  drop, before the tick loop. This is already computed as `patterns_after_drop`
  — no extra call needed.
- `post_tick_patterns` = `_count_complete_squares()` after the tick loop and
  gravity settling (step 5).
- `WEIGHT = 0.05` — same scale as `patterns_created` and `adjacent_patterns_created`.
- The delta is **signed**: positive if the sweep left behind a combinable residual,
  negative if it left behind isolated junk.
- Conditioned on `score_delta > 0` to avoid double-counting placement quality
  that `patterns_created` already rewards.

### Why end-of-ticks, not per-sweep

- Board isn't fully settled during the tick loop (falling cells are applied at
  step 5, after the loop).
- Consistent with `score_delta`, which is also measured end-to-end.
- Single clean measurement; no noise from multiple sweeps in one placement.

### Full reward (PPO_21)

```
reward = score_delta
       + patterns_created * 0.05
       + height_delta
       + holding_score_reward
       + adjacent_patterns_created * 0.05
       + chain_delta_reward
       + post_sweep_pattern_delta_reward   # NEW
       + death_penalty
```

---

## Implementation scope

**`python/game/env.py` only** — one new reward term in `_step_per_block`.

1. Reuse `patterns_after_drop` as `pre_tick_patterns`.
2. After step 5, compute `post_tick_patterns = self._count_complete_squares()`.
3. Compute `post_sweep_pattern_delta = post_tick_patterns - pre_tick_patterns`.
4. Add to reward only if `score_delta > 0`.
5. Add `post_sweep_pattern_delta` key to `info["reward_components"]`.

No architecture changes. No hyperparameter changes. No new helpers needed.

---

## What stays the same

- CNN depth, MLP size, LR schedule, entropy, clip_range — all unchanged from PPO_20
- All existing reward terms and weights unchanged
- Test suite passes without modification (new term is additive)

---

## Success criteria

- Agent continues to build and sweep combos (eval reward doesn't regress)
- Qualitatively: board after sweep shows more same-color neighbors / combinable
  cells visible during `--render` eval
- `post_sweep_pattern_delta` in reward_components is net positive over an episode
