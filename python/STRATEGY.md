# Lumines Optimal Strategy & Reward Design

## Optimal Lumines Strategy: Alternating Single-Color Combos

The most efficient Lumines strategy is **alternating single-color combos**:

1. **Identify the dominant color** — whichever color has the longer consecutive 2×2 chain.
2. **Build that chain across columns** — place blocks so the dominant color's 2×2 patterns
   extend horizontally. Shared cells mean more area covered per block.
3. **The timeline sweep clears the dominant-color patterns**, leaving the other color
   consolidated on the board.
4. **Shift focus to the remaining color** — it now becomes the dominant color.
5. Repeat.

### Why this beats mixed-color play

- Same-color 2×2 patterns can share cells with adjacent patterns (one column width per
  additional pattern). Mixed-color patterns cannot share cells this way.
- Clearing one color naturally consolidates the other, setting up the next sweep without
  extra placement work.
- A chain of N consecutive same-color pattern-columns scores proportionally more than N
  isolated patterns, due to the combo multiplier applied by the sweep.

### Correct definition of "combo chain length"

A **combo chain of length N** is a sequence of N consecutive columns where each adjacent
pair of columns contains same-color 2×2 patterns that **share at least one cell**.

Two 2×2 patterns — one with top-left at `(row_a, col)` and one at `(row_b, col+1)` —
share a cell if and only if their 2-row windows overlap:

```
|row_a − row_b| ≤ 1
```

A chain is therefore a connected path through the board, not merely a set of occupied
consecutive columns.  Two columns can both contain same-color 2×2 patterns yet be
**disconnected** if their patterns are at entirely different heights (e.g. one at the top
of the board and one at the bottom).

#### Historical bug (fixed 2026-03-02)

`_count_single_color_chain` prior to this fix collected all columns that contained *any*
same-color 2×2 pattern and returned the longest consecutive run — without checking whether
adjacent columns' patterns were at compatible row positions.  Consequences:

- **Inflated chain metrics**: a nearly-full board produced long "chains" from accidental
  same-color adjacencies scattered at different heights, particularly during early training
  when random policies fill the board quickly.
- **Misleading observations**: `light_chain` and `dark_chain` observation scalars fed this
  inflated value to the policy, making the board look more combo-ready than it was.
- **Corrupted reward signals**: any run that shaped reward on `single_color_chain_delta`
  (PPO_30–34) received gradient from noise, not real chain-building behaviour.  This is
  a plausible contributing factor to why those runs failed to learn the alternating-color
  strategy despite explicit incentives.

The fix (see `_count_single_color_chain` in `python/game/env.py`) uses a DP pass that
tracks which row each column's patterns appear at and only extends a chain when the next
column has a pattern within one row of the predecessor.

---

## What "Good Board State" Means

### Pre-sweep (after block placement, before sweep clears)

- **High chain of the dominant color**: the sweep is about to clear it, so maximise the
  consecutive run of dominant-color 2×2 patterns.
- Avoid disrupting the dominant color's chain with a stray opposite-color cell.

### Post-sweep (after clearing + gravity settle)

- **High color purity**: the remaining color should be concentrated and contiguous, not
  scattered.
- **Long chain of the now-dominant color**: sets up the next sweep cycle immediately.
- Low column heights: headroom for future placements.

---

## Reward Design Rationale

### Reward equation (PPO_35)

For per-block mode:

```
reward_t = score_delta_t + death_t
```

- `score_delta_t`: real game points gained from timeline clearing this step.
- `death_t`: `-3.0` on terminal step, else `0`.

### Why no shaping

Every board-state signal considered — height, variance, fill, chain length, color purity
— encodes implicit strategy assumptions. None are truly neutral:

- **`patterns_formed`** (PPO_34): created a local optimum where the agent maximized
  isolated 2×2 same-color squares without ever discovering the sweep combo mechanic.
  The agent could get consistent gradient from making patterns anywhere, so it never
  needed to learn that patterns must align with the timeline to score.
- **Height / variance / fill**: penalizes height universally, but a tall single-color
  chain is *good* if the sweep is about to clear it.
- **Chain / purity**: assumes the alternating single-color strategy is correct, baking
  in the answer rather than letting the agent discover it.

`n_steps=4096` spans approximately 682 full sweep cycles per rollout
(4096 blocks × 40 ticks/block ÷ 240 ticks/sweep). Credit assignment from sweep events
back to placement decisions is handled by the rollout length, not by shaping.

Pure `score_delta` keeps the true objective as the only training signal. The agent must
discover the combo mechanic through exploration — which is what the higher initial
entropy (`0.15`) is for.
