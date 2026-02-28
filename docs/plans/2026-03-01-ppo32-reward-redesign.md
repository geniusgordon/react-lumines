# PPO_32: Reward Redesign — Color-Aware Signals + Near-Pattern Coverage

**Date:** 2026-03-01

## Overview

PPO_32 accumulates all reward changes developed after PPO_31 and will be the next training run. No architecture or observation space changes from PPO_31 (aside from the `dominant_color_chain` → `light_chain` + `dark_chain` obs split already done). The reward is redesigned in three stages:

1. **Color-aware post-sweep reward** — replace color-agnostic shaping with per-color delta signals
2. **Chain blocker penalty** — penalise wrong-color 2×2 patterns inside the dominant chain zone
3. **Near-pattern coverage** — fill the initial-phase signal gap before any complete 2×2 exists

## Final Reward Formula

```python
reward = score_delta                              # primary: actual combo payoff
       + chain_delta_any_color   * 0.03           # density aid: color-agnostic pre-sweep bootstrap
       + near_pattern_delta      * 0.01           # initial aid: progress toward first 2×2
       + post_sweep_light_delta  * 0.05           # strategy: color-aware post-sweep delta
       + post_sweep_dark_delta   * 0.05           # strategy: color-aware post-sweep delta
       + chain_blocking_delta    * -0.05          # blocking: wrong-color 2×2 in chain zone
       + initial_blocking_delta  * -0.03          # blocking: single-cell blocker of near-pattern
       + death                                    # survival: DEATH_PENALTY on game over, else 0
```

---

## Stage 1: Color-Aware Post-Sweep Reward

### Problem (PPO_30 / PPO_31)

PPO_30 introduced `single_color_chain_delta * 0.1` (pre-sweep, color-aware delta) and
`post_sweep_chain * 0.05` (post-sweep level). Two remaining issues:

- `post_sweep_chain` was a **level** (always ≥ 0), not a delta — every step earned free credit for pre-existing board state regardless of whether the action contributed anything.
- When a big sweep fired (`score_delta > 0`), the board was cleared → `post_sweep_chain ≈ 0` → large positive `score_delta` paired with near-zero `post_sweep_chain`. Mixed signal that implicitly discouraged the exact combos we want.

### Solution

Replace with **per-color post-sweep deltas**: change in each color's chain relative to the
previous step's post-sweep value.

- `chain_delta_any_color * 0.03` (pre-sweep, color-agnostic, weight reduced from 0.1 to 0.03)
- `post_sweep_light_delta * 0.05` (post-sweep, light chain delta)
- `post_sweep_dark_delta * 0.05` (post-sweep, dark chain delta)

Delta form attributes reward only to the current action's net effect. On steps where `score_delta > 0` (real sweep scored), post-sweep deltas are **zeroed** — the sweep fired mid-tick-loop, making the delta meaningless as a signal for this placement.

### Obs change: `dominant_color_chain` → `light_chain` + `dark_chain`

The single `dominant_color_chain` scalar (max of light/dark) was replaced by two separate scalars, one per color, normalised to [0,1]. The agent can now observe each color's chain independently — necessary to condition on the color-aware reward signals.

---

## Stage 2: Chain Blocker Penalty

### Problem

`chain_delta_any_color` can only increase or stay flat when a block lands (complete 2×2 patterns never disappear due to placement). Neutral or bad moves get reward ≈ 0 — there is no negative signal to discourage destructive placements that cap the dominant chain.

### Solution

`chain_blocking_delta * -0.05`: change in wrong-color 2×2 pattern count inside the dominant chain's zone (chain_left−1 to chain_right+1). An increase means the agent placed a blocker that caps horizontal or vertical growth; the −0.05 weight makes it a penalty.

Zone coverage of ±1 column handles both:
- **Lateral blocking**: wrong-color patterns at the frontier prevent the chain extending left/right
- **Vertical blocking**: wrong-color patterns inside the chain prevent the sweep clearing the full vertical extent

Not gated on `score_delta > 0` — blocking the right portion of the chain while the sweep is already mid-board is still a bad placement even if it doesn't reduce the score on this exact step.

---

## Stage 3: Near-Pattern Coverage

### Problem

Before any complete 2×2 pattern exists on the board:
- `chain_delta_any_color` fires zero (no complete patterns yet)
- `chain_blocking_delta` fires zero (no chain zone defined yet)

The initial phase is completely signal-free: good and bad placements both receive 0. This slows early learning and lets the agent develop bad habits before any corrective signal fires.

### Definitions

**Near-pattern**: a 2×2 region with **2 or 3** cells of one color and the rest empty — completable in one block drop.
- *3 cells + 1 empty*: one matching cell from the next drop completes it
- *2 cells + 2 empty*: two matching cells from the next drop complete it
- *1 cell + 3 empty excluded*: too noisy; complete-from-1 cases are already caught by `chain_delta_any_color` when the drop creates the pattern

**Blocked near-pattern**: a 2×2 region with exactly 3 cells of one color and 1 cell of the other — an active single-cell blocker preventing completion.

### Solution

- `near_pattern_delta * 0.01`: change in max near-pattern count (clipped ≥ 0, pre-sweep). Clipped so completions (which fire `chain_delta_any_color` instead) don't produce a spurious negative.
- `initial_blocking_delta * -0.03`: change in blocked near-pattern count (post-sweep). Penalises placing a single wrong-color cell into a 2×2 region that had 3 matching cells.

### Weight rationale

- `near_pattern_delta * 0.01` < `chain_delta_any_color * 0.03`: near-patterns are noisier and less definitive; 2-cell case (broad definition) inflates count, so weight must stay small.
- `initial_blocking_delta * -0.03` < `chain_blocking_delta * -0.05`: single-cell blockers of near-patterns are less severe than full wrong-color 2×2s inside an established chain. Both can fire simultaneously for the worst placements.

---

## Changes

### `python/game/env.py`

| What | Details |
|------|---------|
| `_count_near_patterns(board, color)` | 2×2 regions with 2 or 3 cells of `color` and rest empty |
| `_count_max_near_patterns(board)` | Max near-pattern count over both colors |
| `_count_blocked_near_patterns(board)` | 2×2 regions with 3 cells of one color and 1 of the other |
| `_count_chain_zone_blockers(board)` | Wrong-color 2×2 count inside dominant chain zone ±1 |
| Obs space | `dominant_color_chain` → `light_chain` + `dark_chain` |
| `_prev_post_sweep_*_chain` | State tracking for post-sweep delta computation |
| Post-sweep delta zeroing | `post_sweep_*_delta = 0` when `score_delta > 0` |
| Reward formula | Full 7-component formula above |
| `info["reward_components"]` | All 7 components + `total` |

### `python/train.py`

- `MLP_KEYS`: `dominant_color_chain` → `light_chain`, `dark_chain`

### `python/STRATEGY.md`

- Full reward design rationale document with signal hierarchy table and per-signal rationale

### Tests

- Updated to PPO_32 formula (keys, formula check, signal-specific tests)

## Design Notes

- No CNN architecture change — 4 channels unchanged.
- MLP input: `dominant_color_chain` (1) → `light_chain` + `dark_chain` (2), so MLP input grows 20 → 21. `train.py` computes this dynamically; docstring updated.
- Breaking change from PPO_31 checkpoints (obs space changed). Cannot resume.

## Verification

```bash
python/.venv/bin/pytest python/tests/ -v
python python/train.py --algo ppo --timesteps 5000 --envs 2 --dummy
```
