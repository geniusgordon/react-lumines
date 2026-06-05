# Lumines — How to Build the Pattern

A construction-level companion to the high-level strategy. Every claim here is
either provable from the scoring function or extracted from real high-score
replays (the `replays/` corpus, faithfully reproduced — see
`scripts/analyze-mygames.ts`).

## The one target shape

From mining the corpus, every 28-window payout (the biggest in the set) is the
same thing: **one wide, tall, solid single-color rectangle, harvested in a single
sweep, with the off-color pushed to the top.**

```
real harvest (01986b2e, 28 windows, pure light):
  · · · · · · · · D · · · · · · ·
  · · · · · D · · D · · · · · · ·     <- dark riding on top (next round's base)
  · · · · · D · · D · · D · · · ·
  · · · · · D · D D · D · · · · ·
  · · · · D D · L L L L · · · · ·
  · · · D L L L L L L L · · · · ·     <- the light mass:
  · · · D L L L L L L L · · · · ·        ~8 cols wide x ~5 tall
  · · · L L L L L L L L L · · · ·
  · · · L L L L L L L L L · · · ·
  · · · L L D L L L L L D · · · ·
```

Why this maximizes score (both laws at once):

- **Windows per cell** (compactness): a W×H mono rectangle yields `(W−1)(H−1)`
  windows. `8×5 = 28`. A tall-thin or wide-thin shape of the same cell count
  yields fewer. Build big in *both* dimensions.
- **Windows per payout** (span): the timeline accumulates `holdingScore` across a
  *contiguous run* of pattern-bearing columns and only cashes when it hits a
  column with no completed 2×2. A field 8 columns wide with no internal bare
  column is harvested as ONE payout. A bare column in the middle splits it into
  two small ones (the #1 leak — see below).

Mixing colors is a minor (+) effect; **size and contiguity dominate.** Don't
chase it. Pure is fine.

## The block alphabet

All 16 spawn blocks (`BLOCK_PATTERNS`) are one of four kinds. The key mechanic
most players miss: **rotation turns a horizontal split into a vertical split**
(verified against `rotateBlockPattern`), and **each column settles to its own
floor independently** (per-column gravity).

| kind | example | count | how to use it |
|---|---|---|---|
| **Pure** | `LL/LL`, `DD/DD` | 2 | Free growth. Drop straight onto a same-color field → +2×2. |
| **Single-off** | `LL/LD` (3+1) | 8 | Mostly good; the lone off-cell is a minor contaminant — aim it upward/outward. |
| **Domino** | `LL/DD` ↔ `DL/DL` | 4 | The workhorse. Rotate to choose: a 2-wide *color layer* OR two adjacent *mono columns*. |
| **Checker** | `LD/DL` | 2 | The weakest block, *not* a dead one. Rotating stays a checker, but its halves split under per-column gravity — straddle a light/dark seam and each half completes a window on its own side (see primitive 5). |

Reading a block: rows are top→bottom as they fall. The **bottom row lands
lower**. So `DD/LL` (top dark, bottom light) settles light-under-dark in each
column — useful for laying a light base with a dark cap.

## The landing law (the one rule that beats block-kind)

Mining every drop in the corpus (`scripts/mine-patterns.ts`) shows that *where a
block's two halves land* predicts its value far more than which block it is.
Classify each half by the cell its bottom touches: its **own** color (`same`),
the **opposite** color (`opp`), or empty **floor**. Aiming both halves at their
own color (`same+same`) is the universal high-value move:

| block | win/drop (`same+same`) | productive | placed-well note |
|---|---|---|---|
| **pure** | **3.00** | 90% | highest value — extend your field |
| **domino-V** | 2.14 | 94% | the workhorse bridge |
| **single-off** | 2.02 | 90% | your most common good move (1624 drops) |
| **domino-H** | 1.71 | 98% | |
| **checker** | 0.89 | 73% | weakest; seam-straddle only (primitive 5) |

Landing quality swings yield ~10–20×. Same block, different landing:
`single-off :: same+same` = **2.02/drop, 90% productive**, but
`single-off :: floor+floor` = **0.09/drop, 9% productive**. So **before every drop,
ask: will both halves land on their own color?**

- **`opp+same` is the validated "off-color to top" (primitive 4):** one half
  extends a field, the off half caps it. `domino-V :: opp+same` even edges out
  `same+same` at **2.18/drop** — a clean cap is as good as a second extension.
- **The real mistakes** (low yield *and* a better move almost always existed,
  by regret): `single-off :: floor+opp` (8% regret-free), `pure :: floor+opp`
  (14%), `domino-V :: opp+opp` (23%). Don't dump a partial or mismatched block
  onto a bare or opposite-color column — route it onto a matching field.
- **Setup moves are the exception:** the metric counts *immediate* windows, so a
  deliberate base-layer (the floor course, primitive 3 — `domino-H` on floor)
  scores 0 immediate windows yet isn't a mistake. Judge those by what they enable
  next, not by this number.

## Construction primitives (with validated numbers)

### 1. Pure extend
Drop a pure block onto your field of that color. Grows it 2×2. If your field is
`W×H`, extending width by 2 adds `2×(H−1)` windows; extending height by 2 adds
`2×(W−1)`. Widening a tall field is worth more than heightening it — **prefer
widening** until you run out of room, then build up.

### 2. Domino bridge (the highest-value skill)
Rotate a domino to a **vertical split** and drop it at the edge of your field,
wanted-color toward the field, off-color seeding the neighbor column. This widens
the field by one column **without ever leaving a bare column**.

```
        col: 3 4 5 6              col: 3 4 5 6
before:       L L · ·   drop LD|LD       L L L D
              L L · ·   at cols 5-6      L L L D
```
Light is now 2×3 (cols 3–5) and col 6 is seeded dark, contiguous — the sweep
won't cash early. The next domino oriented `D|x` at cols 6–7 completes the dark
and the run keeps extending.

### 3. Floor course
Use **horizontal-split** dominoes (`DD/LL`) as a base layer: light lands low,
dark caps it. Lay several across the bottom to start a wide light base fast,
with the dark already staged on top (where you want it — see primitive 5).

### 4. Off-color to the top
This is what the real harvests show: keep your **target color in the bottom rows,
push the off-color up**. Orient blocks so the wanted color is in the bottom row
(`DD/LL` for a light base; `LL/DD` for a dark base). The off-color accumulates as
a cap that (a) stays out of the mono field and (b) falls down to become the next
round's base after the harvest — this *is* the color-alternation rhythm
(`alternationRate` correlated +0.35 with score).

### 5. Checker split-fill (the seam straddle)
Checkers (`LD/DL`) can't be made mono by rotation, but "always contaminates" is
**false**. Mined over the corpus (`scripts/checker-usage.ts`): of 473 checker
drops, **57% created at least one 2×2 window and 59% put a checker cell directly
inside a new window** — and checker placements were regret-free **48%** of the
time, essentially identical to every other block (49%). They are the *weakest*
block (0.67 windows/drop vs 1.78 for non-checkers) but routinely productive.

The high-value pattern: **straddle the seam between a light shelf and a dark shelf
that differ in height by about one cell.** Because the two same-color cells sit on
opposite diagonals, each half lands on its own color and completes a window on
each side; the two off-color cells end up on *top* as caps (primitive 4). One
checker → two windows, no contamination.

```
real drop (01982885, checker @ cols 8-9, +2 windows, regret 0):
   cols: 6 7 8 9            cols: 6 7 8 9
before:    · · · ·   drop      · · D ·   <- dark cap rides on top
           L L · ·   LD|DL     L L L ·   <- light half completes the light shelf
           L L L ·   at 8-9    L L L ·
           D D D ·             D D D L   <- light cap rides on top
           D D D ·             D D D D   <- dark half completes the dark shelf
           D D D D             D D D D
```
The light shelf (cols 6–8) tops out one row above the dark shelf (col 9 floor),
so col 8 takes `L` then `D`, col 9 takes `D` then `L` — a light 2×2 forms top-left,
a dark 2×2 forms bottom-right, and both stray cells cap out.

Fallbacks when no seam is available, best first:
- Drop on the off-color cap so the stray cell joins the off-color pile.
- Place at the far edge/wall where one half abuts same-color.
- Never drop a checker into the *middle* of a forming mono field — that punches a
  contaminated hole and fragments the harvest.

## The #1 leak: premature small payouts

The timeline cashes the instant it crosses a column with no completed 2×2. Your
corpus had **87 small payouts (<8 windows, avg 3.7, ~3.5 cols)** — each one a
field that got cashed before it was wide. Causes and fixes:

- **A bare column inside your field** → splits one big payout into two small.
  Fix: domino-bridge (primitive 2) to keep columns contiguous; never wall off a
  single column.
- **A narrow tower / deep well** → the gap is a bare column. Fix: keep the
  surface level; widen before you build tall.
- **Sealing the off-color into its own column** → that column has no mono square
  yet = a gap. Fix: off-color to the *top* (primitive 4), not into a side column.

Converting those 87 small payouts to medium is worth roughly **+14 points/game**.

## The round cycle (putting it together)

1. **Lay a wide base** of color A across as many columns as you can (floor
   course + pure extends), pushing color B to the top.
2. **Widen, don't wall.** Use domino bridges to keep the field contiguous to 8+
   columns. Dump checkers onto the B cap.
3. **Harvest wide.** Let the timeline sweep the whole field in one pass — aim for
   a single 16–28 window payout, not three 6-window ones.
4. **Inherit.** After the sweep clears the A field, the B cap falls to the floor
   and becomes your next base. Now build a wide B field. Alternate.

## Measurable goals

- Small payouts (<8 windows) per game → toward **0**.
- `win/payout` → from ~14 toward **16+** (your best game hit 16.5).
- Biggest single payout per game → toward **28** (an 8×5 field).

Re-run `scripts/analyze-mygames.ts` after a session to track these.

## How this revises the original four intuitions

- **Square > thin strip** — keep, and extend: build big in *both* dimensions
  (square for per-cell value, width for per-payout value).
- **Focus one color** — revise: it's a *round-level rhythm* (build a wide field
  led by one color, alternate next round), NOT per-payout purity. Purity caps
  your span; the data shows pure and mixed both win as long as the field is wide.
- **Don't seal color early** — confirmed: a sealed-off column is a bare column =
  premature small payout.
- **Don't build narrow towers** — confirmed: towers create the bare columns and
  deep wells that fragment harvests.
