# Lumines Strategy

A strategy for playing this game better, **derived from your own 48 leaderboard
replays** rather than from folklore. Every claim here is either provable from the
scoring function or extracted by replaying your real games through the game engine
and measuring what actually happened on the board.

This doc is the strategy. Two companions go deeper:

- **[building-patterns.md](./building-patterns.md)** — *how to build*: the block
  toolkit and the concrete placement recipes, with ASCII diagrams.
- **[tools.md](./tools.md)** — *how to measure*: the scripts that mine your
  replays, the metrics library, and the replay-fidelity rules behind every number.

---

## The one fact everything follows from

**Your score per sweep = the number of internal 2×2 single-color windows the
timeline cashes — not the number of cells cleared.**

- A solid `W×H` single-color rectangle is worth `(W−1)(H−1)` windows.
  A `2×2` is worth 1; an `8×5` is worth `7×4 = 28` (the biggest harvest in your
  corpus).
- The timeline sweeps left→right, **accumulating** window value across a
  *contiguous run* of columns that each carry a completed 2×2, and **cashes the
  whole run** the instant it reaches a column with no completed 2×2 (a "gap
  column"). Both colors' windows in the run are cashed together.

Everything below is a consequence of this one fact.

---

## The three laws

### Law 1 — Size: build wide *and* tall
`(W−1)(H−1)` grows fastest when you grow *both* dimensions, so a fat rectangle
beats a thin strip of the same cell count. Widening a tall field adds `2×(H−1)`
windows; heightening a wide field adds `2×(W−1)` — so **widen first**, build up
later. The target shape is one big field, roughly `8×5`, cashed in a single sweep.

### Law 2 — Contiguity: one unbroken run, no gap columns
The sweep cashes at the first gap column, so a single bare or unfinished column
*inside* your field splits one big harvest into two small ones. This is your **#1
leak**: 87 premature payouts (<8 windows, avg 3.7) across 48 games, clustered hard
on **gap column 11** — fields built rightward but cashed before column 11 was
completed. Keep the run contiguous; bridge the gap before the sweep reaches it.

### Law 3 — Landing: every half onto its own color
The single biggest predictor of a drop's value is not which block it is, but
**where its two halves land**. Aim *both* halves at their own color. The same
block placed well vs badly swings ~10–20× in value. Crucially, **off-color does
not go on top of your field** — a cap scores nothing and blocks the column from
growing taller. Off-color goes into its **own ≥2-wide region** beside the field,
so one sweep cashes both colors. (Full toolkit in
[building-patterns.md](./building-patterns.md).)

---

## The combo chain — the scoring engine

The biggest lever above raw harvest size is **not making isolated harvests at
all** — it's anchoring **one region** and re-harvesting it every time the sweep
comes back around. This is the clearest advanced finding in your replays:

- **78% of all payouts re-harvest the previous region** (>50% column overlap), and
  your **top games chain 86% vs 72%** in your bottom games (correlation +0.33).
- Chained cashes land **~240 frames apart — exactly one sweep cycle** (15
  frames/col × 16 cols). The sweep cashes your region, you refill it before it
  comes back, it cashes again. Your longest chain ran **15 straight cashes of one
  region**, 9–20 windows each — roughly the whole game's score from one engine.

How to run the engine:

1. **Anchor, don't scatter.** Pick a wide region and keep building *there*. The
   same columns pay every cycle; spreading builds across the board breaks the chain.
2. **Refill on the residue.** A cash clears only the completed 2×2s; the leftover
   cells (off-color, partials) stay as **scaffolding**. Build the next field on top
   of them — you start halfway up, not from the floor.
3. **Pace to the cycle (~240 frames ≈ 4s).** You have about one sweep revolution to
   refill before the timeline returns. That cadence is your clock.
4. **Let color alternate inside the chain.** As residue flips, consecutive cashes
   swing light-heavy → dark-heavy → light-heavy. *This* is the real mechanism
   behind the +0.35 alternation signal — colors take turns within the same region,
   not an off-color cap "becoming the next base."

---

## Your scorecard (current corpus baseline)

| metric | now | target | why |
|---|---|---|---|
| `win/payout` (windows per sweep) | **14.1** | **16+** | Law 1 — bigger harvests; your best game hit 16.5 |
| biggest single payout | **23.8** | **28** | an `8×5` field |
| premature payouts (<8 win) / game | **~1.8** (87 total) | **0** | Law 2 — stop fragmenting |

Your top 9 games average `win/payout` **15.4** with **fewer** payouts (14.4);
your bottom 9 average **13.4** with **more** payouts (15.4). The lever is payout
**size**, not count — and `meanSweepValue` (windows/payout) is the strongest
single correlate of final score (**+0.62**). Re-run
`pnpm tsx scripts/analyze-mygames.ts` after a session to track these.

---

## The practice loop

```
play a game
  ->  pnpm tsx scripts/harvest-trace.ts trace      see how your big harvests were built
  ->  pnpm tsx scripts/flag-leaks.ts <replay>      find fragmented harvests in that game
  ->  fix ONE habit (start with bridging gap column 11)
  ->  pnpm tsx scripts/analyze-mygames.ts          track win/payout & small-payout count
```

Drill one leak at a time. The fastest single win is converting bridgeable
premature payouts into the wide harvests they should have been.

---

## Why believe this (evidence)

Derived from 48 of your 50 replays that **reproduce faithfully** (simulated score
== recorded score; 2 legacy replays are excluded — see
[tools.md](./tools.md)). Headline signals (Spearman ρ vs final score; small,
luck-influenced corpus, so treat as suggestive and lean on the ones with a
mechanism):

| signal | ρ | reading |
|---|---|---|
| `meanSweepValue` (windows/payout) | **+0.62** | payout **size** is the #1 lever (Law 1) |
| `alternationRate` | **+0.35** | alternate the lead color round-to-round |
| `meanPurity` (per-payout single-colorness) | **−0.29** | forcing purity *caps span* — mixed wide runs win |

The construction claims (the landing law, off-color-to-its-own-region, checkers
being usable) come from mining every drop and tracing every harvest, not from
these correlations — see [building-patterns.md](./building-patterns.md) for the
per-claim evidence.

### What did *not* move the needle (and untapped frontiers)

Mining honestly means reporting the nulls. In this corpus, three plausible
"advanced" levers showed **no correlation with score**:

- **Sweep-relative timing.** Where you drop is statistically *independent* of the
  sweep position (mean lead ~7 of 16 for top and bottom alike). You aren't timing
  builds to the sweep at all — so this isn't disproven, it's **unexploited**.
- **Surface flatness.** Bumpiness, buried "dead" cells, and deep wells *weakly
  correlate positively* with score — roughness is a side-effect of ambitious
  building, not a cause of failure. Global flatness is not the lever; **field-level
  contiguity** (Law 2) is.
- **Queue / 2-ply forecast.** Only ~9% of moves beat the greedy choice on a
  2-block lookahead, with no link to score. You're barely using the preview.

Timing and forecast are the **open frontiers**: the data can't yet say whether
deliberate sweep-timing or preview play helps, because your games don't do them.
They're the natural place to run controlled experiments next. The tools that
produced these nulls (`timing-analysis.ts`, `surface-analysis.ts`,
`queue-analysis.ts`) are in [tools.md](./tools.md).
