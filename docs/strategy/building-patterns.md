# How to Build the Pattern

The construction manual behind the [strategy](./README.md). Every claim is either
provable from the scoring function or extracted from your real replays (mined with
the tools in [tools.md](./tools.md)). Read the strategy first for *why*; this doc
is *how*.

Quick legend for diagrams: `L` = light, `D` = dark, `·` = empty. In trace
snippets, `+` marks a cell the current drop placed and `*` marks a cell cleared in
the harvest.

---

## The target shape

Every 28-window harvest in your corpus is the same thing: **one wide, tall, solid
single-color rectangle, kept open on top so it grew tall, cashed in one sweep.**

```
real harvest (01986b2e, 28 windows, all-light; * = cleared, plain = survived):
  · · · · · · D · · · · · · · · ·
  · · · D · · D · · · · · · · · ·     <- dark on top SCORED NOTHING:
  · · · D · · D · · · · · · · · ·        thin 1-wide stacks, never marked.
  · · · D · D D · D · · · · · · ·        It capped cols 3 & 6 and blocked them.
  · · D D · L*L*L*L*· · · · · · ·
  · D L*L*L*L*L*L*L*· · · · · · ·     <- the light mass that actually paid:
  · D L*L*L*L*L*L*L*· · · · · · ·        wide AND tall, open on top.
  · L*L*L*L*L*L*L*L*L*· · · · · ·
  · L*L*L*L*L*L*L*L*L*· · · · · ·
  · L*L*D L*L*L*L*L*D · · · · · ·
```

Read it carefully: **every cleared cell is light.** The dark riding on top is not
"staging for next round" — it is dead weight that scored zero and capped two
columns so they couldn't grow taller. This single example overturns the old
"push the off-color up" advice (see primitive 4).

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
| **Pure** | `LL/LL` | 2 | **3.00** | Free growth — drop straight onto a same-color field. |
| **Domino-V** | `LD/LD` | (4 total) | 2.14 | The workhorse bridge — two adjacent mono columns. |
| **Single-off** | `LL/LD` (3+1) | 8 | 2.02 | Your most common block; aim the 3-side at its field, the lone cell outward. |
| **Domino-H** | `LL/DD` | (4 total) | 1.71 | A two-color *layer* — a floor course, or one color onto each of two fields. |
| **Checker** | `LD/DL` | 2 | 0.89 | Weakest, **not** dead — straddle a seam (primitive 5). |

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

### 2. Domino bridge — the highest-value skill
Rotate a domino to a **vertical split** and drop it at the field's edge,
wanted-color toward the field, off-color seeding the neighbor column. Widens the
field by one column **without ever leaving a bare column** — directly serves Law 2.

```
        col: 3 4 5 6              col: 3 4 5 6
before:       L L · ·   drop LD|LD       L L L D
              L L · ·   at cols 5-6      L L L D
```
Light is now `2×3` (cols 3–5) and col 6 is seeded dark, contiguous — the sweep
won't cash early. A following domino completes the dark and the run keeps growing.

### 3. Floor course
Use **horizontal-split** dominoes (`DD/LL`) across the bottom to start a wide base
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
before:    · · · ·   drop      · · D ·   <- dark stray caps out (the tax)
           L L · ·   LD|DL     L L L ·   <- light half completes the light shelf
           L L L ·   at 8-9    L L L ·
           D D D ·             D D D L   <- light stray caps out
           D D D ·             D D D D   <- dark half completes the dark shelf
           D D D D             D D D D
```

Fallbacks when no seam exists, best first: drop on an existing off-color cap so
the stray joins that pile; place at a wall where one half abuts same-color; **never
drop a checker into the middle of a forming field** — it punches a contaminated
hole that fragments the harvest.

---

## Leaks and fixes

The timeline cashes the instant it crosses a column with no completed 2×2. Your
87 premature small payouts (<8 windows, avg 3.7, ~3.5 cols wide; cluster on gap
column 11) come from three causes:

| leak | what happens | fix |
|---|---|---|
| **bare column inside the field** | splits one big payout into two small | domino-bridge (primitive 2); keep columns contiguous |
| **narrow tower / deep well** | the gap *is* a bare column | keep the surface level; widen before building tall |
| **off-color sealed in a lone 1-wide column** | that column has no 2×2 = a gap | give off-color its own **≥2-wide** region (primitive 4) |

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
