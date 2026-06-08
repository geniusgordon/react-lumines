# How to Build the Pattern

The construction manual behind the [strategy](./README.md). Every claim is either
provable from the scoring function or extracted from your real replays (mined with
the tools in [tools.md](./tools.md)). Read the strategy first for *why*; this doc
is *how*.

Quick legend for diagrams: `·` empty, `○` light, `●` dark. In harvest snippets
`◌`/`◍` mark a light/dark cell **cleared this sweep**; in before/after snippets
`*` marks a cell the current drop placed. All board diagrams are real positions
pulled from your replays (`scripts/doc-examples.ts`), not hand-drawn.

---

## The target shape

Every 28-window harvest in your corpus is the same thing: **one wide, tall, solid
single-color rectangle, kept open on top so it grew tall, cashed in one sweep.**

```
real harvest (01986b2e, 28 windows, all-light):
  · · · · · · ● · · · · 
  · · · ● · · ● · · · · 
  · · · ● · · ● · · · · 
  · · · ● · ● ● · ● · · 
  · · ● ● · ◌ ◌ ◌ ◌ · · 
  · ● ◌ ◌ ◌ ◌ ◌ ◌ ◌ · · 
  · ● ◌ ◌ ◌ ◌ ◌ ◌ ◌ · · 
  · ◌ ◌ ◌ ◌ ◌ ◌ ◌ ◌ ◌ · 
  · ◌ ◌ ◌ ◌ ◌ ◌ ◌ ◌ ◌ · 
  · ◌ ◌ ● ◌ ◌ ◌ ◌ ◌ ● · 
```

Read it carefully: **every cleared cell (`◌`) is light.** The dark (`●`) riding on
top is not "staging for next round" — it is dead weight that scored zero and capped
columns so they couldn't grow taller. This single example overturns the old "push
the off-color up" advice (see primitive 4).

Two laws are visible at once:
- **Windows per cell** — `(W−1)(H−1)` rewards a fat rectangle over a thin one.
- **Windows per payout** — the contiguous run cashes as ONE payout only if no
  bare column splits it.

---

## The block toolkit

All 16 spawn blocks (`BLOCK_PATTERNS`) are one of four kinds. Two mechanics most
players miss: **rotation turns a horizontal split into a vertical split**
(verified against `rotateBlockPattern`), and **each column settles to its own
floor independently** (per-column gravity — a 2-wide block over uneven ground
splits, its halves landing at different heights).

| kind | example | count | win/drop placed well | how to use it |
|---|---|---|---|---|
| **Pure** | `○○/○○` | 2 | **3.00** | Free growth — drop straight onto a same-color field. |
| **Domino-V** | `○●/○●` | (4 total) | 2.14 | The workhorse bridge — two adjacent mono columns. |
| **Single-off** | `○○/○●` (3+1) | 8 | 2.02 | Your most common block; aim the 3-side at its field, the lone cell outward. |
| **Domino-H** | `○○/●●` | (4 total) | 1.71 | A two-color *layer* — a floor course, or one color onto each of two fields. |
| **Checker** | `○●/●○` | 2 | 0.89 | Weakest, **not** dead — straddle a seam (primitive 5). |

(Dominoes are 4 blocks total; rotation flips each between the H and V form.)
Reading a block: rows fall top→bottom, so the **bottom row lands lower**.

---

## The landing law

Mining every drop (`scripts/mine-patterns.ts`) shows *where a block's two halves
land* predicts value far more than which block it is. Classify each half by what
its bottom cell touches: its **own** color (`same`), the **opposite** color
(`opp`), or empty **floor**. Aiming both halves at their own color (`same+same`)
is the universal high-value move — and the table above is exactly the `same+same`
yield per kind.

How much landing matters, same block:

| placement | win/drop | productive |
|---|---|---|
| `single-off :: same+same` | **2.02** | 90% |
| `single-off :: floor+floor` | **0.09** | 9% |

So **before every drop, ask: will both halves land on their own color?**

- **`opp+same` is a trap.** It scores well immediately (`domino-V :: opp+same` =
  2.18/drop) — but that score comes entirely from the half that *extends* a field.
  The half that *caps* the other field scores nothing now and blocks its growth
  later. Per-drop window counts can't see that deferred cost (primitive 4).
- **The real mistakes** (low yield *and* a better move almost always existed, by
  regret): `single-off :: floor+opp` (8% regret-free), `pure :: floor+opp` (14%),
  `domino-V :: opp+opp` (23%). Don't dump a partial or mismatched block onto a
  bare or opposite-color column — route it onto a matching field.
- **Setup moves are the exception.** This metric counts *immediate* windows, so a
  deliberate base layer (floor course, primitive 3) scores 0 now yet isn't a
  mistake — judge it by what it enables.

---

## The five primitives

### 1. Pure extend
Drop a pure block onto its own field. If the field is `W×H`, widening adds
`2×(H−1)` windows, heightening adds `2×(W−1)`. **Widen first**, build up later.
Highest value of any move (3.00 win/drop).

```
real drop (0197f030 @col 8, +6 windows in one drop; * = placed):
before:            after:
  ● · · ·            ● · · ·
  ○ · · ·            ○ · · ·
  ○ · · ·            ○ · · ·
  ○ · · ○            ○ ○*○*○
  ○ · · ○            ○ ○*○*○
  ○ ○ ○ ○            ○ ○ ○ ○
```
A single pure light block dropped into the notch fuses the two light walls into
one solid `4×?` block — six new 2×2 windows from one piece.

### 2. Domino bridge — the highest-value skill
Rotate a domino to a **vertical split** and drop it at the field's edge,
wanted-color toward the field, off-color seeding the neighbor column. Widens the
field by one column **without ever leaving a bare column** — directly serves Law 2.

```
        col: 3 4 5 6              col: 3 4 5 6
before:       ○ ○ · ·   drop ○●|○●       ○ ○ ○ ●
              ○ ○ · ·   at cols 5-6      ○ ○ ○ ●
```
Light is now `2×3` (cols 3–5) and col 6 is seeded dark, contiguous — the sweep
won't cash early. A following domino completes the dark and the run keeps growing.

### 3. Floor course
Use **horizontal-split** dominoes (`●●/○○`) across the bottom to start a wide base
fast. Note the dark half lands *on top* of the light in each column — that is debt
(primitive 4), not staging; it pays only if you grow it into its own dark field.

### 4. Off-color to its own region — never on top
Tracing the biggest harvests (`scripts/harvest-trace.ts`) shows **capping the
target field with off-color is a mistake**, not a feature:

- The biggest harvests are wide fields kept **open on top** so they grow tall. In
  the 28-window harvest above, every cleared cell is light; the dark on top scored
  nothing.
- Open-top field columns harvest **taller** than off-color-capped ones (**4.08 vs
  3.76 cells/col** across the corpus). A cap costs height *and* scores nothing.
- 49% of field-column tops at cash time are exactly this dead-weight cap; only 29%
  are a "harvested cap" (an off-color block ≥2 tall that forms its own windows and
  clears in the same sweep — the good case).

What to do instead:
1. **Keep the target color on top** so the field keeps extending up.
2. **Route off-color into its own ≥2-wide region** beside the field, so the sweep
   cashes **both colors in one contiguous run**.
3. The `alternationRate` +0.35 signal is real, but the mechanism is **alternating
   which color is the wide field round-to-round** — not "the cap becomes the base."

```
real two-color harvest (01982ddb, 23 windows — one sweep cashes BOTH colors):
  · · · · ◌ ◌ · ◌ ◌ · 
  · · ◌ ◌ ◌ ◌ ◌ ◌ ◌ · 
  · · ◌ ◌ ◌ ◌ ◌ ◍ ◍ · 
  · ● ◌ ◌ ◍ ◍ ◍ ◍ ◍ · 
  · ○ ◍ ◍ ◍ ◍ ◍ ◍ ◍ · 
  · ◍ ◍ ◍ ◍ ◍ ◍ ◍ ◍ · 
  · ◍ ◍ ◍ ◍ ◍ ◍ ○ ● ○ 
```
The light block (`◌`) and the dark mass (`◍`) are *side by side*, each its own
solid region, so the contiguous run cashes both at once — far more than a light
field with the dark wasted as a cap on top.

### 5. Checker split-fill — the seam straddle
"Always contaminates" is **false** (`scripts/checker-usage.ts`): of 473 checker
drops, 57% created a 2×2 and 59% put a checker cell inside a new window, and they
were regret-free 48% of the time — the same as every other block (49%). Checkers
are the *weakest* block (0.67 win/drop vs 1.78), not a useless one.

The high-value use: **straddle the seam between a light shelf and a dark shelf that
differ in height by ~1.** The two same-color cells sit on opposite diagonals, so
each half lands on its own color and completes a window on each side — two windows
from one checker.

```
real drop (01982885, checker @ cols 8-9, +2 windows, regret 0):
   cols: 6 7 8 9            cols: 6 7 8 9
before:    · · · ·   drop      · · ● ·   <- dark stray caps out (the tax)
           ○ ○ · ·   ○●|●○     ○ ○ ○ ·   <- light half completes the light shelf
           ○ ○ ○ ·   at 8-9    ○ ○ ○ ·
           ● ● ● ·             ● ● ● ○   <- light stray caps out
           ● ● ● ·             ● ● ● ●   <- dark half completes the dark shelf
           ● ● ● ●             ● ● ● ●
```

Fallbacks when no seam exists, best first: drop on an existing off-color cap so
the stray joins that pile; place at a wall where one half abuts same-color; **never
drop a checker into the middle of a forming field** — it punches a contaminated
hole that fragments the harvest.

---

## Advanced: the combo chain (the scoring engine)

The five primitives build *one* field. The real engine is re-harvesting **one
region** every sweep cycle — see the strategy doc for the headline numbers (78% of
payouts re-harvest the prior region; top games 86% vs 72%; cashes land ~240 frames
= one sweep cycle apart). Here is what it looks like, three consecutive cashes from
a real 15-cash chain (`01982c72`, `scripts/combo-inheritance.ts trace`):

Three consecutive cashes of the same region (cols 2–14), each ~one sweep cycle
apart — note the color flips dark → light → mixed as the residue inverts:

```
cash 7: 16 windows (dark)      cash 8: 20 windows (light)     cash 9: 13 windows
  · ● · · · · · · · · ·          · · · · ○ · · · · · ·          · · · · ○ ○ · · · · ·
  · ● · · · · · · · · ·          · · · · ● · · · · · ·          · · ● ○ ○ ○ ○ ○ · · ·
  · ○ ○ · · · ○ · · · ·          · · · · ● · · · · · ·          · · ● ○ ○ ○ ○ ○ · · ·
  · ○ ○ · ○ ○ ○ ○ · · ·          · ● · · ● · · · · · ·          · · ● ○ ◍ ◍ ◍ ○ ○ · ·
  · ○ ○ ○ ○ ◍ ◍ ◍ · · ·          · ● · · ● ● · ● · · ·          · · ● ● ◍ ◍ ◍ ◍ ◍ ◍ ·
  · ○ ○ ○ ○ ◍ ◍ ◍ · · ·          · ◌ ◌ ◌ ◌ ● ● ● · · ·          · ● ◌ ◌ ◍ ◍ ◍ ◍ ◍ ◍ ○
  · ○ ○ ○ ○ ◍ ◍ ◍ ○ · ·          · ◌ ◌ ◌ ◌ ● ◌ ◌ ◌ · ·          · ● ◌ ◌ ◍ ◍ ◍ ◍ ◍ ◍ ●
  · ◍ ◍ ◍ ◍ ◍ ◍ ◍ ◍ · ·          · ◌ ◌ ◌ ◌ ◌ ◌ ◌ ◌ · ·
  · ◍ ◍ ◍ ◍ ◍ ◍ ◍ ◍ · ○          · ◌ ◌ ◌ ◌ ◌ ◌ ◌ ◌ · ○
  · ◍ ◍ ◍ ◍ ○ ● ○ ○ ● ●          · ◌ ◌ ◌ ◌ ◌ ● ◌ ◌ ● ●
```

Each cash clears only the completed 2×2s (`◌`/`◍`); the unmarked cells stay as
**scaffolding**, and the next batch of drops refills *on top of them* — you start
halfway up, not from the floor. The color **alternates** cash to cash: the
off-color left by one cash becomes the field for the next. That is the real
mechanism behind the `alternationRate` +0.35 signal — not an off-color "cap
becoming the base."

To run it: **anchor one wide region and keep building there**, refill on the
residue, pace to the ~240-frame cycle, and let the two colors take turns. Scatter
your builds and the chain breaks into one-off harvests.

**Frontiers (unexploited in the corpus).** Two advanced levers showed *no* signal
because your games don't currently use them — deliberate **sweep-relative timing**
(your drop column is independent of the sweep position) and **queue/preview play**
(only ~9% of moves beat a greedy 1-ply choice on a 2-block lookahead). The combo
chain already implies a clock (the sweep cycle); explicitly timing refills to it,
and using the preview to pre-shape the region, are the natural experiments next.

## Leaks and fixes

The timeline cashes the instant it crosses a column with no completed 2×2. Your
87 premature small payouts (<8 windows, avg 3.7, ~3.5 cols wide; cluster on gap
column 11) come from three causes:

| leak | what happens | fix |
|---|---|---|
| **bare column inside the field** | splits one big payout into two small | domino-bridge (primitive 2); keep columns contiguous |
| **narrow tower / deep well** | the gap *is* a bare column | keep the surface level; widen before building tall |
| **off-color sealed in a lone 1-wide column** | that column has no 2×2 = a gap | give off-color its own **≥2-wide** region (primitive 4) |

```
real leak (01982e04) — sweep cashed at gap col 6 for only 5 windows:
  · · ● · · · · · · 
  · · ● · · · · ● · 
  · · ● ● · · ● ● ● 
  · · ◌ ◌ · ● ○ ○ ○ 
  · · ◌ ◌ ● ● ○ ○ ○ 
  · ◌ ◌ ◌ ◌ ● ○ ○ ○ 
  · ◌ ◌ ◌ ◌ ○ ○ ○ ○ 
```
Only the small light field (`◌`, cols 1–4) cashed. A dark wall at col 5 split it
from a **whole second light field** (`○`, cols 6–8, 13 cells) sitting one column
past the gap. Bridge col 5 instead of walling it off and this is one ~18-window
harvest, not a 5-window scrap.

Converting your bridgeable premature payouts into the wide harvests they should
have been is the single biggest available gain — see `scripts/flag-leaks.ts` and
`scripts/aggregate-leaks.ts` in [tools.md](./tools.md).

---

## How this revises the original four intuitions

- **Square > thin strip** — kept, and sharpened: build big in *both* dimensions.
- **Focus one color** — revised: it's a *round-level rhythm* (one wide field per
  round, alternate the lead next round), **not** per-payout purity. Forcing purity
  caps your span and *hurts* score (−0.29); wide mixed runs win.
- **Don't seal a color early** — confirmed: a sealed-off lone column is a bare
  column = a premature small payout.
- **Don't build narrow towers** — confirmed: towers create the bare columns and
  deep wells that fragment harvests.
- **New, from the data:** off-color belongs beside the field, never as a cap on
  top of it.
