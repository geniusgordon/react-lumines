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

### Signal hierarchy

| Signal | Role | Weight |
|--------|------|--------|
| `score_delta` | Ground truth — actual combo payoff from sweep | 1.0 (direct) |
| `post_sweep_light_delta` | Strategy shaping — color-aware post-sweep delta | 0.05 |
| `post_sweep_dark_delta` | Strategy shaping — color-aware post-sweep delta | 0.05 |
| `chain_delta_any_color` | Density aid — color-agnostic pre-sweep bootstrap | 0.03 |
| `chain_blocking_delta` | Blocking penalty — wrong-color 2×2 count change in chain zone | −0.05 |
| `open_pattern_delta` | Initial-phase aid — progress toward first 2×2 pattern | 0.01 |
| `ruined_pattern_delta` | Initial-phase penalty — single-cell blocker of a near-pattern | −0.03 |
| `death` | Survival penalty | −3.0 on terminal |

### Why `score_delta` is ground truth

It directly measures combo value. Any shaping signal that contradicts `score_delta` is
wrong. Shaping signals exist only to reduce sparsity and guide strategy; they must not
override `score_delta`.

### Why pre-sweep shaping is color-agnostic (small weight)

Pre-sweep chain delta can penalise optimal "neutral" placements — a mixed block placed
harmlessly that doesn't extend the dominant chain but doesn't break it either will get a
zero or slightly negative pre-sweep signal even though it's fine. Pre-sweep is an
intermediate board state; the sweep immediately modifies it, making it a noisy proxy.

Keeping the pre-sweep signal **color-agnostic** (just "did you form any pattern?") with a
**small weight (0.03)** bootstraps early learning without strongly encoding strategy. It
will not mislead in later training because post-sweep signals (0.05 × 2) outweigh it when
patterns exist.

### Why post-sweep shaping is color-aware

Post-sweep measures true board quality after clearing + gravity settling. This is where
strategy lives: did you leave a good setup for the next sweep? Color-aware deltas encode
single-color commitment correctly — if you disrupted the dominant color, the corresponding
`post_sweep_*_delta` goes negative even if you built some patterns in the other color.

### Why post-sweep uses a delta, not absolute value

Absolute post-sweep chain gives free credit for pre-existing good board state — any action
on a board that already has a long chain gets rewarded regardless of whether the action
contributed. The delta (`current - previous step's post-sweep`) attributes reward only to
the current action's net effect on board quality.

### Why post-sweep is zeroed on actual sweep steps

`post_sweep_*` is computed by simulating a clear on the *current* board. Over several placement
steps, the simulated post-sweep chain grows and the positive deltas reward that buildup. When the
timeline sweep fires for real, the board has already been cleared; computing post_sweep_* on this
cleared board gives a much lower value. Without zeroing, the delta on that step would be:

    delta = (low post-clear value) − (high pre-clear value) → large negative

This would penalise the agent for the very scoring event the buildup was meant to produce — the
opposite of correct. Zeroing prevents the spurious negative; the actual payoff is captured by
`score_delta`. `_prev` is updated unconditionally even on sweep steps, so the *next* step's delta
is relative to the post-clear board, correctly starting a fresh buildup cycle.

### Why `open_pattern_delta` and `ruined_pattern_delta` are needed

Before any complete 2×2 pattern exists, `chain_delta_any_color` fires zero and
`chain_blocking_delta` fires zero (no chain zone is defined). The initial phase of the game
is completely signal-free: good placements and bad placements both receive 0 reward.

`open_pattern_delta` fills the positive gap. A **near-pattern** is a 2×2 region with 2 or
3 same-color cells and the rest empty — completable in one block drop. Counting the maximum
near-pattern count over both colors and taking the delta (clipped to ≥ 0) gives a small
positive signal for moves that progress toward the first complete 2×2. The clip prevents
spurious negatives when a near-pattern graduates to a complete pattern (which fires
`chain_delta_any_color` instead).

`ruined_pattern_delta` fills the negative gap. A **blocked near-pattern** is a 2×2 region
with exactly 3 cells of one color and 1 cell of the other — the single wrong-color cell
prevents completion. An increase means the agent just destroyed a near-pattern by placing a
blocker; the −0.03 weight makes that a penalty.

**Why smaller weights than their chain counterparts?**

- `open_pattern_delta * 0.01` < `chain_delta_any_color * 0.03`: near-patterns are less
  definitive than complete 2×2s; the 2-cell case (broader definition) is noisier — many
  regions qualify early on, so the count is high and the weight must stay small.
- `ruined_pattern_delta * -0.03` < `chain_blocking_delta * -0.05`: single-cell blockers
  of near-patterns are less severe than full wrong-color 2×2 patterns inside an established
  chain. Both can fire simultaneously for the worst placements, compounding the penalty
  appropriately.

### Why `chain_blocking_delta` is needed

`chain_delta_any_color` can only increase or stay flat when a block lands (completed 2×2
patterns never disappear due to placement). This means neutral or bad moves get reward ≈ 0
— there is no negative signal to discourage destructive placements.

`chain_blocking_delta` fills this gap by counting **wrong-color 2×2 patterns inside the
dominant chain's zone** (chain_left−1 to chain_right+1). An increase means the player just
placed a blocker that caps horizontal or vertical growth of the dominant chain; the −0.05
weight makes that a penalty. Coverage of ±1 column naturally handles both:

- **Lateral blocking**: wrong-color patterns at the frontier columns prevent the chain from
  extending left or right.
- **Vertical blocking**: wrong-color patterns stacked inside the chain columns prevent the
  sweep from clearing the full vertical extent.

No `score_delta > 0` gating is applied (unlike `post_sweep_*_delta`) because the sweep
moves left-to-right over multiple frames; blocking the right portion of the chain while the
sweep is already mid-board is still a bad placement even if it doesn't reduce the score on
this exact step.

---

## Guidance for Future Reward Changes

1. **Never reduce `score_delta`'s effective weight** — it is the only correct objective.
2. **Pre-sweep signals should stay color-agnostic and small** — they are a density aid, not
   a strategy encoder.
3. **Post-sweep signals encode strategy** — keep them color-aware and in delta form.
4. **Post-sweep should outweigh pre-sweep** — currently 0.05 × 2 vs 0.03; maintain this
   ratio or increase post-sweep weight.
5. **`chain_blocking_delta` provides the missing negative gradient** — keep it at −0.05
   (small enough not to dominate, large enough to discourage blockers).
6. **Adding a color-commitment bonus** (e.g. rewarding when both sweeps use the same
   dominant color) is a valid next step to further incentivise the alternating combo
   strategy.
6. **The agent's target behavior**: commit to one color per sweep cycle, maximise that
   color's combo, then naturally shift to the other color after clearing.
