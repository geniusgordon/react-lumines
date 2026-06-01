# Lumines Strategy Metrics — Design

**Date:** 2026-06-02
**Goal:** Turn the player's intuitive Lumines strategies into precise, computable
definitions, validate which ones actually predict a higher score, and expose them
as named patterns. **For human improvement, not an AI agent.** Presentation
(HUD / replay-review UI / written guide) is deliberately deferred — this spec
stops at validated metrics plus replay notation.

## Background

The player has four intuitions but no precise definitions or way to know which
are real:

1. **一次專注消一個顏色** — focus on clearing one color per sweep round; reusing
   cells builds 2×2 patterns efficiently, and the residual after the sweep is
   mostly the other color, seeding the next round.
2. **不要太早封色** — don't seal a color off too early or the combo can't continue.
3. **不要疊窄高塔/窄縫** — don't build narrow tall towers or narrow gaps; they're
   unfillable.
4. **方塊 > 細長** — square combos are more efficient than thin rectangles.

The codebase already has a metrics foundation in `src/utils/placementMetrics/`
(`boardColorBalance`, `deadCells`, `sweepYield`, `detectPayout`), a
replay→notation CLI (`scripts/replay-to-notation.ts`), and v2 replays that are
fully reconstructable from `seed` + `blockQueue` + `inputs`.

## Guiding principle: derive metrics from the scoring function

The single most important design decision: **every metric is derived from, or
validated against, the real scoring mechanic** — not invented as a plausible
proxy. That is what makes this "systematic" rather than another layer of
intuition.

From `timeline.ts` + `patterns.ts`, a payout is worth:

- `detectPatterns` finds **every** 2×2 monochrome window (overlapping windows
  all count).
- As the sweep crosses columns, `holdingScore += (pattern-squares whose left
  edge is in that column)`.
- The payout adds `holdingScore` to `score`.

Therefore **score per payout = the number of internal 2×2 windows in the cleared
region — not the number of cells cleared.** For a monochrome W×H rectangle that
is exactly **(W−1)(H−1)**.

Two consequences:

**A. Intuition 4 is provable, not folklore.** For a fixed cell budget A,
maximizing (W−1)(H−1) subject to W·H = A is an AM-GM result maximized at
W ≈ H. For 16 cells: 4×4 → **9 pts**, 2×8 → 7 pts, 16×1 → **0 pts**. We can
state intuition 4 exactly and quantify how many points any non-square region
leaves on the table. No empirical validation needed (only a sanity check).

**B. `sweepYield` measures the wrong unit.** It counts `clearedCells`; *value*
is `scoreDelta` = holdingScore = the 2×2-window count. Two payouts clearing the
same cells can score very differently by shape. The framework's primary value
unit is **points-per-payout** and **points-per-cell (shape efficiency)**;
cleared-cells is a secondary stat. `scoreDelta` is already captured by
`detectPayout` — we elevate it.

## Strategy hierarchy

- **Strategic (multi-drop, round granularity):** intuition 1 — the color
  alternation rhythm synced to the sweep.
- **Tactical (per-region, per-drop):** intuitions 2, 3, 4 — largely *what you do
  in service of* intuition 1. Committing the board to one color is what produces
  compact regions (4), avoids prematurely sealing the other color (2), and
  avoids mixed narrow towers (3).

This hierarchy dictates how feedback is later surfaced: per-drop regret for
tactics, per-round analysis for strategy.

## The metric + pattern catalog

A "round" = one full left-to-right timeline pass (16 column advances; the config
runs ~15 rounds in 60s). Light = cell value 1, dark = 2.

| # | Intuition | Precise definition (metric) | Status |
|---|---|---|---|
| 4 | 方塊 > 細長 | **Region efficiency** = (internal 2×2 windows) ÷ cells, per monochrome connected region. The exact points the region will yield; square → max. | **Provable** (sanity-check only) |
| 3 | 不要窄高塔/窄縫 | **Well profile** = max depth of ≤1-wide gaps + bumpiness (column-height variance). A 1-wide column can never self-form a 2×2; deep wells are unfillable before the sweep. Relates to `deadCells`. | Mechanically motivated; **validate weight** |
| 2 | 不要太早封色 | **Frozen-growth** = a monochrome region whose every growth edge is blocked by opposite-color or wall, capping its (W−1)(H−1) before the sweep arrives. Generalizes `deadCells` (fully dead) → "alive but capped." | **Validate** it predicts score |
| 1 | 一次專注消一個顏色 | **Focus rhythm**, three sub-claims (below). | **Validate** (most likely partly folklore) |

### Intuition 1 — focus rhythm sub-metrics

- **Payout purity** — fraction of a payout's cleared 2×2 windows that are the
  dominant color. High purity = the payout was color-focused, not a mix.
- **Alternation** — does the dominant cleared color flip A→B→A→B across rounds?
  Measured as alternation rate / sign-flip frequency of dominant payout color
  over consecutive rounds.
- **Residual hand-off** — immediately after clearing color A,
  `boardColorBalance.delta` should point toward B (the residual seeds the next
  round). Measured as: sign of post-payout board delta vs the color just
  cleared — they should be opposite.

### Teaching layer: decision regret (per drop)

For each dropped block, enumerate the legal alternative placements
(columns × rotations, via `gameLogic` collision/physics), score each by the
metrics above (especially Δ region-efficiency, Δ dead/frozen cells, Δ
well-depth), and report the gap between the chosen placement and the best one.
This converts intuition into specifics: *"drop #47 at column 3 created 2 dead
cells; column 11 would have grown the dark region from 2×3 to 3×3, +4 points."*

This is the heaviest component (placement enumeration + per-candidate
simulation) and is flagged as such for implementation sequencing.

### Named pattern detectors (notation vocabulary)

Fire on specific configurations and tag the notation output:
`SEALED-COLOR`, `NARROW-WELL`, `THIN-STACK`, `MISSED-SQUARE`. These make replays
readable in the player's own strategy language and are the qualitative
counterpart to the quantitative metrics.

## Validation method

1. **Corpus.** Assemble replays — the player's local saved replays plus the
   Supabase leaderboard replays (all v2, reconstructable). Replay each through
   the existing trajectory machinery (`createSnapshotsForReplay`) to recover
   every board state, drop, and payout, plus `finalScore`.
2. **Compute** all metrics per-drop and per-payout, aggregated per run.
3. **Correlate** each metric against `finalScore` across the corpus using
   Spearman rank correlation (small corpus, monotonic relationships). Report
   effect size, then **keep / demote / drop** each intuition by predictive
   power. Intuition 4 is exempt from truth-validation (proven) but gets a sanity
   check that high scorers do build compact regions.
4. **Output** a ranked report — e.g. *"alternation: strong predictor;
   well-depth: weak; focus-purity: moderate."* This report is the primary
   deliverable: it tells the player which intuitions to trust and prioritize.

### Corpus caveats

- The corpus is the player's own (plus public leaderboard) replays — likely
  small and skill-skewed. Correlations are suggestive, not proof; the report
  must state N and not overclaim.
- Block sequences are RNG-determined, so luck contributes to `finalScore`.
  Metrics that survive across varied seeds are the trustworthy ones.

## Where the code lives

- **`src/utils/placementMetrics/`** (pure functions, each with `__tests__`,
  matching existing convention): add `regionEfficiency`, `wellProfile`,
  `frozenGrowth`, `focusRhythm`, `decisionRegret`. Elevate `scoreDelta` as the
  primary value unit alongside `sweepYield`.
- **`scripts/` corpus runner** (sibling to `replay-to-notation.ts`): load many
  replays, compute metrics, emit the Spearman correlation report.
- **`scripts/replay-notation/`**: add the four named detectors so replays are
  tagged in the strategy vocabulary.
- **Presentation stays out of scope** (HUD / review UI / written guide decided
  later).

## Module boundaries

Each metric is an independent pure function: input is a board (or a board
trajectory / payout list), output is a scalar or small struct. They are testable
in isolation against hand-built board fixtures, and consumable independently by
the corpus runner, the notation CLI, and any future presentation layer.
`decisionRegret` is the one cross-cutting unit — it depends on `gameLogic`
placement simulation plus the other metrics — and is kept in its own module so
its complexity doesn't leak into the simple snapshot metrics.

## Out of scope

- Any presentation layer (HUD, replay-review UI, strategy document).
- AI / RL agent work.
- Lookahead solver / oracle (Approach C) — rejected as overkill for human
  coaching.
- Changes to game rules, scoring, or the reducer.
