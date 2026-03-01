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

### From-scratch reward equation

For per-block mode:

```
reward_t = score_delta_t
         + SHAPING_LAMBDA * (SHAPING_GAMMA * Phi(s_{t+1}) - Phi(s_t))
         + death_t
```

- `score_delta_t`: real game points gained this step (ground truth objective).
- `Phi(s)`: board quality potential (dense strategy signal).
- `death_t`: `-3.0` on terminal, else `0`.

This is potential-based shaping, so shaping helps exploration but does not redefine the
real objective.

### Potential design (post-clear simulated board)

`Phi` is computed on the board after simulated clear + gravity (not raw pre-sweep board):

```
Phi = 1.0 * chain_max
    + 0.6 * purity
    - 0.8 * blockers
    - 0.3 * height
    + 0.2 * setup
```

All terms are normalized to `[0, 1]`:

- `chain_max`: longest same-color consecutive 2×2 chain.
- `purity`: dominant-color ratio among filled cells.
- `blockers`: opposite-color 2×2 blockers inside dominant chain zone.
- `height`: tallest column height ratio.
- `setup`: near-pattern opportunity density (2 or 3 cells of same color + empty remainder).

### Why this design

1. `score_delta` remains the true objective and largest signal.
2. One coherent shaping term replaces many hand-tuned deltas.
3. Post-clear evaluation aligns shaping with real sweep-cycle strategy.
4. Negative pressure (`blockers`, `height`) and positive pressure (`chain_max`, `purity`, `setup`)
   are balanced in the same potential.

### Guidance for tuning

1. Keep `score_delta` unscaled.
2. Tune `SHAPING_LAMBDA` first (`0.10` early training, lower later).
3. Keep `SHAPING_GAMMA` aligned with PPO discount (default `0.99`).
4. If policy becomes too conservative, reduce `w_height` or `w_blockers`.
5. If opening phase is weak, increase `w_setup` slightly.
6. Target behavior remains: commit to one color for the current sweep cycle, then switch naturally after clear.
