# Lumines Strategy Analysis

A toolset for improving your own play, data-driven rather than by intuition. It
replays your recorded games through the real game engine, measures what happened
at the board level, and tells you concretely where points were left on the table.

Companion docs:
- **[building-patterns.md](./building-patterns.md)** — the construction catalog
  (block alphabet, named patterns with ASCII, the harvest cycle). *What to build.*
- This README — the tools, metrics, and how to use them. *How to measure.*

## TL;DR — the practice loop

```
play a game  ->  pnpm tsx scripts/flag-leaks.ts <replay.json>   (spot fragmented harvests)
             ->  apply the domino-bridge fix (see building-patterns.md)
             ->  pnpm tsx scripts/analyze-mygames.ts            (track win/payout & small-payout count)
```
Targets: small payouts (<8 windows) → 0; `win/payout` → 16+; biggest payout → 28.

## The one fact everything is built on

**Score per payout = the number of internal 2×2 monochrome windows the timeline
cashes in one sweep — not the number of cells cleared.** A W×H mono rectangle is
worth `(W−1)(H−1)`. The timeline accumulates across a *contiguous run* of
pattern-bearing columns and cashes when it hits a column with no completed 2×2.
So a big score = **wide, solid, single-color fields harvested in one sweep**, and
the dominant leak is letting the sweep cash a narrow field early.

Every metric below is derived from this fact or validated against it.

## Data-backed findings (from 48 faithfully-reproduced replays)

| signal | result | takeaway |
|---|---|---|
| `meanSweepValue` (windows/payout) | Spearman **+0.62** vs finalScore | payout **size** is the #1 lever |
| top vs bottom games | top have *fewer* payouts (14.4 vs 15.4) but *bigger* (15.4 vs 13.4 win/payout) | build wider, harvest less often |
| `alternationRate` | **+0.35** | alternate the dominant color round-to-round (keep) |
| `meanPurity` | **−0.29** | per-payout single-color purity *hurts* — it caps span |
| premature small payouts | 87 across 48 games, avg 3.7 windows | converting them ≈ **+14 pts/game** |
| biggest harvests | 8-wide × 5-tall mono rectangles (`(8−1)(5−1)=28`) | the target shape |

Full reasoning and the construction recipes are in
[building-patterns.md](./building-patterns.md).

## Tools

All read replays that **faithfully reproduce** (simulated score == recorded
`finalScore`). Legacy v1 replays that diverge are skipped/warned — see *Replay
fidelity* below.

### `scripts/flag-leaks.ts <replay.json>` — per-game leak finder
Flags each **premature small payout** (<8 windows) and whether it was
**bridgeable** (same-color material sat at/just past the gap column → you
fragmented one big harvest into small ones) vs **edge/clean** (nothing to
connect). Prints a board snippet for the worst fragmented harvest.
```
pnpm tsx scripts/flag-leaks.ts replays/0197f030-….json
```

### `scripts/analyze-mygames.ts` — score decomposition (reads `replays/`)
Per-corpus breakdown: `score = payouts × win/payout`, plus a top-vs-bottom
contrast and total decision-regret. Skips non-reproducing replays (with a
warning). Use it to track progress across sessions.
```
pnpm tsx scripts/analyze-mygames.ts
```

### `scripts/aggregate-leaks.ts` — corpus-wide leak audit (reads `replays/`)
Runs the `flag-leaks` classifier across every reproducing replay and clusters the
premature small payouts by **game phase**, **dominant color**, and **gap column**,
then lists the worst-fragmenting games. Use it to find which *habit* to drill —
e.g. the current corpus leaks cluster hard on **gap column 11** (fields built
rightward but cashed before col 11 was bridged). Re-run after a session to watch
a cluster shrink.
```
pnpm tsx scripts/aggregate-leaks.ts
```

### `scripts/mine-patterns.ts` — building-pattern miner (reads `replays/`)
Tags every drop with a color-agnostic *landing signature* — for each of the
block's two columns, did its bottom cell land on the **same** color, the
**opposite** color, or empty **floor**? — then clusters `(block-kind × signature)`,
ranks by total 2×2 windows produced, and prints a real ASCII example of each.
Surfaces the data-backed "landing law": aim both halves at their own color
(`same+same`); the same block on `floor+floor` yields ~10–20× less. Feeds the
catalog in [building-patterns.md](./building-patterns.md).
```
pnpm tsx scripts/mine-patterns.ts
```

### `scripts/checker-usage.ts` — checker-block audit (reads `replays/`)
Mines every checker drop and measures how often it actually completed a 2×2
window (vs the "always contaminates" folklore), compares yield against all other
blocks, and dumps the most productive checker placements as ASCII so the real
pattern is readable. Finding: checkers are the weakest block but productive 57%
of the time — the seam-straddle (primitive 5) is the high-value use.
```
pnpm tsx scripts/checker-usage.ts
```

### `scripts/metrics-corpus.ts <replay.json …>` — cross-game correlations
Computes each strategy metric per game and reports its Spearman correlation with
`finalScore`, sorted by strength. Needs ≥2 replays.
```
pnpm tsx scripts/metrics-corpus.ts replays/*.json
```

### `scripts/replay-to-notation.ts <replay.json>` — annotated game record
Markdown move-by-move record with board snapshots and named pattern tags
(`NARROW-WELL`, `THIN-STACK`, `SEALED-COLOR`, `MISSED-SQUARE(-N)`) on each drop.

## Metrics library (`src/utils/placementMetrics/`)

Pure functions over a board (or a list of payout records), each unit-tested:

| function | measures | intuition |
|---|---|---|
| `computeRegionEfficiency` | windows ÷ cells per mono region | square > thin strip (provable) |
| `computeWellProfile` | well depth + bumpiness | narrow towers/gaps create bare columns |
| `computeFrozenGrowth` | per-color "seal pressure" | don't wall a color off early |
| `computeFocusRhythm` | payout purity / alternation / hand-off | color rhythm across rounds |
| `computeSweepValue` | points (scoreDelta) per payout | the real value unit |
| `computeDecisionRegret` | chosen vs best placement (windows) | per-drop "points left on the table" |
| `computeBoardColorBalance`, `computeDeadCells`, `computeSweepYield`, `detectPayout` | supporting metrics | |

## Replay fidelity (important)

Simulation runs through the real `gameReducer` via the shared driver
`src/utils/replaySimulation.ts` (`driveReplay`), which mirrors the live player:
it **ticks through the countdown** and runs the **full game duration** (not just
to the last input). With this, **48/50** of the legacy v1 leaderboard replays
reproduce their recorded score exactly.

- **v2 replays** (recorded by the current build) store the block queue and always
  reproduce. Any game you record now is v2.
- **v1 replays** reconstruct blocks from the seed RNG. Most reproduce because the
  RNG is unchanged; a few very old ones diverge (end in early game-over) and are
  auto-excluded by each tool's trust guard.
- **Never trust board-level metrics from a replay that didn't reproduce** — the
  simulated game isn't the one that was played. The tools enforce this.

## Provenance

This system was built spec-first; see
`docs/superpowers/specs/2026-06-02-lumines-strategy-metrics-design.md` and
`docs/superpowers/plans/2026-06-02-lumines-strategy-metrics.md` for the original
design and implementation plan.
