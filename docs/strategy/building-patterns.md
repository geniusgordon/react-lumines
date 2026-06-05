# Lumines — How to Build the Pattern

A construction-level companion to the high-level strategy. Every claim here is
either provable from the scoring function or extracted from real high-score
replays (the `replays/` corpus, faithfully reproduced — see
`scripts/analyze-mygames.ts`).

## The one target shape

From mining the corpus, every 28-window payout (the biggest in the set) is the
same thing: **one wide, tall, solid single-color rectangle, kept *open* on top
so it grew tall, harvested in a single sweep.**

```
real harvest (01986b2e, 28 windows, pure light; * = cleared, plain = survived):
  · · · · · · D · · · · · · · · ·
  · · · D · · D · · · · · · · · ·     <- dark sitting on top SCORED NOTHING:
  · · · D · · D · · · · · · · · ·        thin 1-wide stacks, never marked.
  · · · D · D D · D · · · · · · ·        It capped cols 3/6 and blocked them.
  · · D D · L*L*L*L*· · · · · · ·
  · D L*L*L*L*L*L*L*· · · · · · ·     <- the light mass that actually paid:
  · D L*L*L*L*L*L*L*· · · · · · ·        wide AND tall, open on top.
  · L*L*L*L*L*L*L*L*L*· · · · · ·
  · L*L*L*L*L*L*L*L*L*· · · · · ·
  · L*L*D L*L*L*L*L*D · · · · · ·
```

Read it carefully: **every cleared cell is light.** The dark riding on top is
*not* "next round's base" — it is unmarked dead weight that scored zero and
capped columns 3 and 6 so they couldn't grow taller. Across the corpus, open-top
field columns harvest taller than off-color-capped ones (4.08 vs 3.76 cells/col,
`scripts/harvest-trace.ts`). Off-color belongs in its **own region**, not on top
(see primitive 4).

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

- **`opp+same` scores well immediately (`domino-V :: opp+same` = 2.18/drop) but
  is a trap** — the score comes from the half that *extends* a field; the half
  that *caps* the other field scores nothing now and blocks its growth later. This
  per-drop number can't see that deferred cost (see primitive 4). Prefer landings
  where the off-half starts/extends its **own** field, not where it caps yours.
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
Use **horizontal-split** dominoes (`DD/LL`) as a base layer to start a wide light
base fast. Note the dark half lands *on top* of the light in each column — that is
debt, not staging (see primitive 4); it only pays if you grow it into its own
dark field, otherwise it caps your light and must be cleared first.

### 4. Off-color to its own region — NOT on top (corrected)
**This reverses the earlier advice.** Tracing the biggest harvests
(`scripts/harvest-trace.ts`) shows off-color *capping* the target field is a
mistake, not a feature:

- The biggest harvests are wide fields kept **open on top** so they grow tall.
  In the 28-window light harvest above, **every cleared cell is light**; the dark
  on top scored nothing and capped two columns.
- Open-top field columns harvest **taller** than off-color-capped ones (4.08 vs
  3.76 cells/col across the corpus). A cap costs height *and* scores nothing
  itself — it just sits there until the field under it clears.
- Why the metrics earlier seemed to bless capping: a block placed `opp+same`
  scores well *immediately* — but that score comes from the half that **extended**
  a field, not the half that capped. The cap's cost (lost height, blocked growth)
  is **deferred**, so per-drop window counts can't see it. This is the case study
  for *not* trusting immediate numbers.

What actually works for the off-color:

1. **Keep the target color on top** of the target field so it keeps extending up.
2. **Route the off-color into its own region** — adjacent columns forming a
   *second field*, so the sweep harvests **both colors in one contiguous run**
   (29% of field-column tops in the corpus are this "harvested cap": an off-color
   block ≥2 tall that clears in the same sweep — good). A *thin* off-color cap
   that never forms its own 2×2 (49% of tops) is dead weight — minimize it.
3. The `alternationRate` +0.35 signal is real, but the mechanism is **alternating
   which color is the wide field round-to-round** and harvesting two-color runs —
   not "the cap falls down to become the next base."

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
each side. One checker → two windows. The two stray cells do end up on top as
caps (the usual cap tax — primitive 4), but here you bought two immediate windows
for it, which is the best a checker offers.

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
- **Sealing the off-color into a lone 1-wide column** → that column has no 2×2 =
  a gap that cashes the run early. Fix: give the off-color its own **≥2-wide**
  region so it forms its own windows and clears in the same run (primitive 4),
  rather than a single bare column *or* a thin cap.

Converting those 87 small payouts to medium is worth roughly **+14 points/game**.

## The round cycle (putting it together)

1. **Lay a wide base** of color A across as many columns as you can (floor
   course + pure extends), keeping the A surface **open on top** so it can grow.
2. **Widen, don't wall.** Use domino bridges to keep the field contiguous to 8+
   columns. Send color B to its **own adjacent block** (≥2 wide), not onto A's
   top — build A and a smaller B field side by side so one sweep cashes both.
3. **Harvest wide.** Let the timeline sweep the whole run in one pass — aim for a
   single 16–28 window payout, not three 6-window ones.
4. **Inherit.** Whatever B material remains seeds the next round; build the wide
   field with B now and stage A to the side. Alternate which color is the wide one.

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
