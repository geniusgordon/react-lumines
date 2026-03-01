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
