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

---

## Guidance for Future Reward Changes

1. **Never reduce `score_delta`'s effective weight** — it is the only correct objective.
2. **Pre-sweep signals should stay color-agnostic and small** — they are a density aid, not
   a strategy encoder.
3. **Post-sweep signals encode strategy** — keep them color-aware and in delta form.
4. **Post-sweep should outweigh pre-sweep** — currently 0.05 × 2 vs 0.03; maintain this
   ratio or increase post-sweep weight.
5. **Adding a color-commitment bonus** (e.g. rewarding when both sweeps use the same
   dominant color) is a valid next step to further incentivise the alternating combo
   strategy.
6. **The agent's target behavior**: commit to one color per sweep cycle, maximise that
   color's combo, then naturally shift to the other color after clearing.
