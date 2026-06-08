# Strategy Analysis Tools

The toolset that produced and validates the [strategy](./README.md). Each script
replays your recorded games through the real game engine, measures the board, and
reports where points were won or lost. Run any of them with `pnpm tsx`.

## Replay fidelity (read this first)

Every tool only trusts a replay that **reproduces faithfully** — the simulated
final score equals the recorded `finalScore`. A replay that doesn't reproduce
didn't replay the game you actually played, so its board metrics are fiction; the
tools skip such replays with a warning (the "trust guard").

Simulation runs the real `gameReducer` through the shared driver
`src/utils/replaySimulation.ts` (`driveReplay`), which mirrors the live player: it
**ticks through the countdown** and runs the **full game duration** (not just to
the last input). With that, **48 of 50** legacy leaderboard replays reproduce
exactly.

- **v2 replays** (current build) store the block queue and always reproduce. Any
  game you record now is v2.
- **v1 replays** reconstruct blocks from the seed RNG. Most reproduce because the
  RNG is unchanged; a few very old ones diverge (early game-over) and are excluded.

---

## Tools

### `analyze-mygames.ts` — score decomposition *(reads `replays/`)*
Corpus breakdown: `score = payouts × win/payout`, a top-vs-bottom-games contrast,
and total decision-regret. Your session scorecard — run it to track progress.
```
pnpm tsx scripts/analyze-mygames.ts
```

### `flag-leaks.ts <replay.json>` — per-game leak finder
Flags each **premature small payout** (<8 windows) and whether it was
**bridgeable** (same-color material sat at/just past the gap column → you
fragmented one big harvest) vs **edge/clean** (nothing to connect). Prints a board
snippet of the worst fragmented harvest.
```
pnpm tsx scripts/flag-leaks.ts replays/0197f030-….json
```

### `aggregate-leaks.ts` — corpus-wide leak audit *(reads `replays/`)*
Runs the `flag-leaks` classifier across every reproducing replay and clusters the
premature payouts by **game phase**, **dominant color**, and **gap column**, then
lists the worst-fragmenting games. This is how the **gap-column-11 cluster** was
found. Re-run after a session to watch a cluster shrink.
```
pnpm tsx scripts/aggregate-leaks.ts
```

### `harvest-trace.ts [caps|trace|all]` — harvest construction *(reads `replays/`)*
Works *backward* from real payouts — the "interleaved setups + scores" lens that
per-drop metrics miss.
- `caps` quantifies the off-color-on-top question (open-top columns harvest taller,
  4.08 vs 3.76 cells/col; 49% of field-tops are dead-weight caps).
- `trace` prints the multi-drop construction of the biggest harvests as ASCII
  (`+` placed, `*` cleared) so you can read how a big field was actually built.

This is the tool that corrected the "off-color to the top" advice.
```
pnpm tsx scripts/harvest-trace.ts trace
```

### `mine-patterns.ts` — building-pattern miner *(reads `replays/`)*
Tags every drop with a color-agnostic **landing signature** (each column's bottom
cell landed on `same` / `opp` / `floor`), clusters `(block-kind × signature)`,
ranks by total windows produced, and prints a real example of each. Source of the
**landing law** and the per-kind value table.
```
pnpm tsx scripts/mine-patterns.ts
```

### `checker-usage.ts` — checker-block audit *(reads `replays/`)*
Mines every checker drop, measures how often it actually completed a 2×2 (vs the
"always contaminates" folklore), compares yield against all other blocks, and dumps
the most productive checker placements as ASCII. Source of the seam-straddle
finding.
```
pnpm tsx scripts/checker-usage.ts
```

### `combo-inheritance.ts [stats|trace]` — combo chaining *(reads `replays/`)*
`stats`: how often consecutive payouts re-harvest the same region (chain rate),
the frame gap between them (≈ one sweep cycle), residue carried across cashes, and
correlations with score. `trace`: prints the longest chain in the corpus cash by
cash, cropped to the region, so the refill-on-scaffolding cycle is visible. Source
of the **combo-chain** finding (top games chain 86% vs 72%).
```
pnpm tsx scripts/combo-inheritance.ts trace
```

### `timing-analysis.ts` — sweep-relative timing *(reads `replays/`)*
Histograms where drops land relative to the sweep (the "lead") and correlates it
with score. Returned a **null** (drop position is independent of the sweep) — kept
as the frontier baseline for any future timing experiment.
```
pnpm tsx scripts/timing-analysis.ts
```

### `surface-analysis.ts` — floor/surface quality *(reads `replays/`)*
Samples buried "dead" cells, surface bumpiness, and deep narrow wells per drop and
correlates with score. Finding: flatness is **not** a success lever (roughness
weakly tracks *higher* scores — a side-effect of ambitious building).
```
pnpm tsx scripts/surface-analysis.ts
```

### `queue-analysis.ts` — queue / 2-ply forecast *(reads `replays/`)*
Tests whether the chosen move sets up the next queued block better than a greedy
1-ply move (2-ply lookahead). Returned a **null** — preview play is barely used
and doesn't track score. Slow (~35s; it does a 1-ply search per drop).
```
pnpm tsx scripts/queue-analysis.ts
```

### `metrics-corpus.ts <replay.json …>` — cross-game correlations
Computes each strategy metric per game and reports its Spearman correlation with
`finalScore`, sorted by strength. Needs ≥2 replays. Source of the +0.62 / +0.35 /
−0.29 headline signals.
```
pnpm tsx scripts/metrics-corpus.ts replays/*.json
```

### `doc-examples.ts` — faithful diagram generator *(reads `replays/`)*
Emits the real board diagrams embedded in [building-patterns.md](./building-patterns.md)
(target harvest, two-color side-by-side, premature leak, pure extend, combo chain)
in the circle notation `· ○ ●` / `◌ ◍`. Re-run it if you want fresh examples; paste
its output into the doc so every diagram stays a real, reproducible position.
```
pnpm tsx scripts/doc-examples.ts
```

### `replay-to-notation.ts <replay.json>` — annotated game record
Markdown move-by-move record with board snapshots and named pattern tags
(`NARROW-WELL`, `THIN-STACK`, `SEALED-COLOR`, `MISSED-SQUARE(-N)`) on each drop.
```
pnpm tsx scripts/replay-to-notation.ts replays/0197f030-….json
```

---

## Metrics library (`src/utils/placementMetrics/`)

Pure, unit-tested functions over a board (or a list of payout records). The tools
above compose these.

| function | measures | tied to |
|---|---|---|
| `computeSweepValue` | points (scoreDelta) per payout | Law 1 — the real value unit |
| `computeRegionEfficiency` | windows ÷ cells per mono region | Law 1 — square > thin strip |
| `computeWellProfile` | well depth + bumpiness | Law 2 — towers/gaps make bare columns |
| `computeFrozenGrowth` | per-color "seal pressure" | Law 2 — don't wall a color off |
| `computeDecisionRegret` | chosen vs best placement (windows) | Law 3 — points left on the table per drop |
| `computeFocusRhythm` | payout purity / alternation / hand-off | the round-level color rhythm |
| `detectPayout` | "did a sweep cash this tick" + cleared count | single source of truth for payouts |
| `computeBoardColorBalance`, `computeDeadCells`, `computeSweepYield` | supporting metrics | |

---

## Provenance

Built spec-first; the original design and implementation plan are in
`docs/superpowers/specs/2026-06-02-lumines-strategy-metrics-design.md` and
`docs/superpowers/plans/2026-06-02-lumines-strategy-metrics.md`. The strategy
findings were layered on afterward by mining the `replays/` corpus with the tools
above.
