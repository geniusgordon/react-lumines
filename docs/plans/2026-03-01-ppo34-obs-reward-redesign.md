# PPO_34: Observation and Reward Redesign

**Date:** 2026-03-01

## Motivation

Two principles guide this redesign:

1. **Don't encode strategy in the observation.** Give the agent the raw game state presented
   in a form the CNN can process. Let it learn strategy from experience, not from our
   assumptions about what good board state looks like.

2. **Reward game events, not strategic quality.** The reward should measure things the
   game itself tracks, not derived board quality assessments that encode our model of
   optimal play.

---

## Observation Space

### Key insight: timeline divides the board into two strategic zones

The timeline sweeps left to right. At any moment:
- **Columns right of `timeline_x`**: intact, not yet swept — the agent is actively building
  patterns here for the upcoming sweep.
- **Columns left of `timeline_x`**: already swept this cycle — residual cells that form the
  foundation for the next combo.

The board already contains both the "current build state" (right) and the "post-sweep
state" (left) as real game data. No simulation is needed. A `timeline_col` mask channel
lets the CNN learn to spatially distinguish these zones on its own, without us hard-coding
the zone semantics.

### Changes

**Add one CNN channel: `timeline_col`**

A 10×16 float32 binary mask with 1.0 in every row of the current `timeline_x` column
and 0.0 elsewhere. This spatially contextualises all other board channels — the CNN can
learn to interpret left-of-mask and right-of-mask differently without being told to.

**Everything else is unchanged.** Absolute light/dark color encoding is kept because it
is the raw game state. Relative dominant/recessive encoding would itself encode our model
of strategy (which color to commit to), contradicting principle 1.

### New observation space

```
CNN channels (5 × 10×16 float32):
  light_board            — 1.0 where cell == light color (unchanged)
  dark_board             — 1.0 where cell == dark color (unchanged)
  light_pattern_board    — cells inside complete 2×2 light patterns, ÷4 (unchanged)
  dark_pattern_board     — cells inside complete 2×2 dark patterns, ÷4 (unchanged)
  timeline_col           — NEW: binary column mask at timeline_x

MLP scalars (unchanged):
  current_block    2×2 int8
  queue            3×2×2 int8
  timeline_x       (1,) int32
  game_timer       (1,) int32
  holding_score    (1,) float32
  light_chain      (1,) float32
  dark_chain       (1,) float32
```

MLP input size remains 21. CNN stem changes from `Conv2d(4, 32, ...)` to
`Conv2d(5, 32, ...)`. No other architectural change.

---

## Reward Function

### Design

```
reward = score_delta
       + PATTERN_LAMBDA * max(0, patterns_formed_delta)
       + death_penalty
```

| Term | Value | Notes |
|---|---|---|
| `score_delta` | game score increase this step | primary objective, unscaled |
| `PATTERN_LAMBDA` | hyperparameter | tune alongside training; start ~0.3 |
| `patterns_formed_delta` | new complete 2×2 patterns formed | see timing below |
| `death_penalty` | -3.0 | unchanged |

### Why this design

**`score_delta`** is the real game objective. It remains unscaled and primary.

**`patterns_formed_delta`** solves the bootstrapping problem without encoding strategy.
Early in training the agent places blocks randomly and rarely scores. Pattern formation
is a natural game event (the game engine already tracks `detected_patterns`) that fires
immediately on block placement, providing a denser signal than score alone. Crucially, it
does not tell the agent *which* color to build, *where* to build, or *how* to chain — the
agent discovers that chains score more than isolated patterns purely from `score_delta`.

**Height is not penalised.** Tall columns lead to death, which is already penalised via
`death_penalty`. Adding an explicit height term would encode our assumption that tall
boards are strategically bad, which the agent can infer itself.

**Potential-based shaping (Φ) is removed.** The PPO_33 potential encoded chain_max,
purity, blockers, setup — all strategic quality assessments under our model of optimal
play. If the agent finds a strategy that doesn't match that model, Φ penalises it. This
contradicts principle 2.

### Timing of `patterns_formed_delta`

In per-block mode, measured as:

```
patterns_before = count_complete_2x2_patterns(board before hard_drop)
patterns_after  = count_complete_2x2_patterns(board after hard_drop, before timeline ticks)
patterns_formed_delta = patterns_after - patterns_before
```

Using `max(0, ...)` means only new pattern formation is rewarded; the timeline sweeping
away existing patterns does not penalise the agent (clearing is already rewarded via
`score_delta`).

---

## Implementation

### `python/game/env.py`

1. Add `timeline_col` key to `observation_space` (Box 0–1, shape 10×16, float32).
2. Add `timeline_col` channel to `_build_obs()`:
   ```python
   col_mask = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
   col_mask[:, self._state.timeline.x] = 1.0
   ```
3. Remove `SHAPING_LAMBDA`, `SHAPING_GAMMA`, all `PHI_W_*` constants.
4. Add `PATTERN_LAMBDA` constant (default 0.3, tunable).
5. In `_step_per_block()`:
   - Capture `patterns_before` immediately before the hard_drop call.
   - Capture `patterns_after` immediately after hard_drop, before the timeline tick loop.
   - Compute `patterns_formed = max(0, patterns_after - patterns_before)`.
   - Replace reward computation:
     ```python
     reward = score_delta + PATTERN_LAMBDA * patterns_formed + death
     ```
6. Remove `_compute_potential`, `_simulate_clear_board`, `_count_chain_zone_blockers`,
   `_count_near_patterns`, `_count_blocked_near_patterns` — no longer used in obs or
   reward. Keep `_count_complete_squares_from_board` (used for pattern counting),
   `_count_single_color_chain` (used for `light_chain`/`dark_chain` scalars).
7. Update `info["reward_components"]` to reflect new terms.

### `python/train.py`

1. CNN stem: `nn.Conv2d(4, 32, ...)` → `nn.Conv2d(5, 32, ...)`.
2. Update `forward()` to stack 5 channels:
   ```python
   x = torch.stack([
       observations["light_board"].float(),
       observations["dark_board"].float(),
       observations["light_pattern_board"].float(),
       observations["dark_pattern_board"].float(),
       observations["timeline_col"].float(),
   ], dim=1)  # [B, 5, 10, 16]
   ```
3. Update docstring (4 channels → 5 channels).
4. `MLP_KEYS` unchanged.

---

## Tests

- Add obs test: `timeline_col` is all-zero except a single column of 1.0 at `timeline_x`.
  Verify at `timeline_x = 0`, `timeline_x = 15`, and mid-board.
- Add reward test: placing a block that completes a new 2×2 pattern gives
  `PATTERN_LAMBDA * 1` additional reward. Placing a block that completes no pattern
  gives 0 pattern reward.
- Verify `patterns_formed_delta` is non-negative (clamped at 0).
- Verify removed helpers (`_compute_potential`, `_simulate_clear_board`, etc.) are gone
  without breaking remaining tests.

---

## Success Criteria

1. Env produces valid obs matching the new `observation_space` (no gym validation errors).
2. PPO_34 training run reaches 1M steps without crashing.
3. Earlier score growth than PPO_33 baseline (pattern signal bootstraps faster).
4. Agent demonstrates combo-building behaviour without chain/purity reward signals.
5. Peak score at 2M steps competitive with PPO_33.
