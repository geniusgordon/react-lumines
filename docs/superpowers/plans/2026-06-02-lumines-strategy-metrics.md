# Lumines Strategy Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the player's four intuitive Lumines strategies into precise, scoring-derived metrics plus a decision-regret teaching layer and named pattern detectors, validated by Spearman correlation against `finalScore` over a replay corpus.

**Architecture:** Each metric is a pure function over a board (or a list of payout records), added to `src/utils/placementMetrics/` following the existing `deadCells`/`boardColorBalance` convention (one file + one test each, exported through `index.ts`). A shared `simulateReplay` helper drives the existing `gameReducer` through a replay and exposes per-drop / per-payout hooks; a corpus-runner script uses it to compute metrics and Spearman correlations. The notation CLI gains named pattern detectors.

**Tech Stack:** TypeScript, Vitest (`pnpm test <path>`), path alias `@/` → `src/`. Pure functions, immutable inputs. Scoring fact this is all built on: **payout value = number of internal 2×2 monochrome windows = `detectPatterns(board).length`**, not cleared-cell count.

---

### Task 1: Result types

**Files:**
- Modify: `src/utils/placementMetrics/types.ts`
- Modify: `src/utils/placementMetrics/index.ts`

- [ ] **Step 1: Add the new result interfaces to `types.ts`**

Append to `src/utils/placementMetrics/types.ts`:

```ts
export interface RegionEff {
  color: 1 | 2;
  cells: number;
  windows: number; // internal 2x2 monochrome windows in this region
  efficiency: number; // windows / cells (0 when cells === 0)
}

export interface RegionEfficiencyResult {
  regions: RegionEff[];
  totalWindows: number; // sum across regions == detectPatterns(board).length
  totalCells: number;
  meanEfficiency: number; // mean of region.efficiency, 0 when no regions
}

export interface WellProfile {
  heights: number[]; // per-column stack height (BOARD_WIDTH entries)
  bumpiness: number; // sum of |height[x] - height[x+1]|
  maxWellDepth: number; // deepest <=1-wide gap (walls count as full height)
  deepWellCount: number; // wells with depth >= threshold
}

export interface FrozenGrowthResult {
  open: { light: number; dark: number }; // windows still able to close mono
  blocked: { light: number; dark: number }; // windows contaminated by opposite
  sealPressure: { light: number; dark: number }; // blocked/(open+blocked), 0 if denom 0
}

export interface PayoutColorRecord {
  dominantColor: 1 | 2;
  dominantShare: number; // share of cleared cells that were the dominant color, [0,1]
  postBalanceDelta: number; // board light-dark immediately AFTER the payout
}

export interface FocusRhythmStats {
  payoutCount: number;
  meanPurity: number; // mean dominantShare
  alternationRate: number; // fraction of consecutive payouts whose dominant color flipped
  handoffRate: number; // fraction of payouts whose residual leaned the OTHER color
}

export interface DecisionRegretResult {
  regret: number; // bestWindows - chosenWindows (>= 0)
  chosenWindows: number;
  bestWindows: number;
  bestX: number;
  bestRotation: number; // 0..3 clockwise quarter-turns from the block's current pattern
  chosenDead: number;
  bestDead: number;
}

export interface SweepValueStats {
  totalPoints: number; // sum of scoreDelta (== holding score paid out)
  meanPoints: number;
}
```

- [ ] **Step 2: Re-export the new types from `index.ts`**

Replace the type-export block at the top of `src/utils/placementMetrics/index.ts` with:

```ts
export type {
  BoardColorBalance,
  DeadCellsResult,
  SweepEvent,
  SweepYieldStats,
  RegionEff,
  RegionEfficiencyResult,
  WellProfile,
  FrozenGrowthResult,
  PayoutColorRecord,
  FocusRhythmStats,
  DecisionRegretResult,
  SweepValueStats,
} from './types';
```

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS (no emit errors). Unused-export warnings are fine.

- [ ] **Step 4: Commit**

```bash
git add src/utils/placementMetrics/types.ts src/utils/placementMetrics/index.ts
git commit -m "feat(metrics): result types for strategy metrics"
```

---

### Task 2: Region efficiency (intuition 4 — square > rectangle)

**Files:**
- Create: `src/utils/placementMetrics/regionEfficiency.ts`
- Test: `src/utils/placementMetrics/__tests__/regionEfficiency.test.ts`
- Modify: `src/utils/placementMetrics/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/placementMetrics/__tests__/regionEfficiency.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeRegionEfficiency } from '../regionEfficiency';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

function fillRect(
  board: GameBoard,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: CellValue
): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      board[y][x] = color;
    }
  }
}

describe('computeRegionEfficiency', () => {
  it('reports nothing for an empty board', () => {
    const r = computeRegionEfficiency(emptyBoard());
    expect(r.regions).toEqual([]);
    expect(r.totalWindows).toBe(0);
    expect(r.meanEfficiency).toBe(0);
  });

  it('counts 9 internal windows in a 4x4 square (the provable case)', () => {
    const board = emptyBoard();
    fillRect(board, 2, 2, 4, 4, 1);
    const r = computeRegionEfficiency(board);
    expect(r.totalWindows).toBe(9); // (4-1)*(4-1)
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].cells).toBe(16);
    expect(r.regions[0].efficiency).toBeCloseTo(9 / 16);
  });

  it('ranks a 4x4 square above an equal-area 2x8 strip', () => {
    const square = emptyBoard();
    fillRect(square, 0, 0, 4, 4, 2);
    const strip = emptyBoard();
    fillRect(strip, 0, 0, 8, 2, 2);
    const sq = computeRegionEfficiency(square).regions[0];
    const st = computeRegionEfficiency(strip).regions[0];
    expect(sq.windows).toBe(9);
    expect(st.windows).toBe(7); // (8-1)*(2-1)
    expect(sq.efficiency).toBeGreaterThan(st.efficiency);
  });

  it('separates two regions of different colors', () => {
    const board = emptyBoard();
    fillRect(board, 0, 0, 2, 2, 1);
    fillRect(board, 5, 5, 2, 2, 2);
    const r = computeRegionEfficiency(board);
    expect(r.regions).toHaveLength(2);
    expect(r.totalWindows).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/placementMetrics/__tests__/regionEfficiency.test.ts`
Expected: FAIL — cannot find module `../regionEfficiency`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/placementMetrics/regionEfficiency.ts`:

```ts
import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import type { RegionEff, RegionEfficiencyResult } from './types';

/**
 * Decompose the board into 4-connected monochrome regions and, for each,
 * count the internal 2x2 windows it contains. A region's window count is
 * exactly the score it would yield if swept (see scoring in timeline.ts),
 * and efficiency = windows / cells is maximized by compact (square) regions —
 * the formal statement of "square combos beat thin rectangles".
 */
export function computeRegionEfficiency(
  board: GameBoard
): RegionEfficiencyResult {
  const seen: boolean[][] = Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => false)
  );
  const regions: RegionEff[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const color = board[y][x];
      if (color === 0 || seen[y][x]) {
        continue;
      }
      const cells = floodFill(board, seen, x, y, color);
      const windows = countWindows(cells);
      regions.push({
        color: color as 1 | 2,
        cells: cells.length,
        windows,
        efficiency: cells.length === 0 ? 0 : windows / cells.length,
      });
    }
  }

  const totalWindows = regions.reduce((s, r) => s + r.windows, 0);
  const totalCells = regions.reduce((s, r) => s + r.cells, 0);
  const meanEfficiency =
    regions.length === 0
      ? 0
      : regions.reduce((s, r) => s + r.efficiency, 0) / regions.length;

  return { regions, totalWindows, totalCells, meanEfficiency };
}

function floodFill(
  board: GameBoard,
  seen: boolean[][],
  sx: number,
  sy: number,
  color: CellValue
): Array<{ x: number; y: number }> {
  const stack = [{ x: sx, y: sy }];
  const cells: Array<{ x: number; y: number }> = [];
  seen[sy][sx] = true;

  while (stack.length > 0) {
    const { x, y } = stack.pop() as { x: number; y: number };
    cells.push({ x, y });
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) {
        continue;
      }
      if (seen[ny][nx] || board[ny][nx] !== color) {
        continue;
      }
      seen[ny][nx] = true;
      stack.push({ x: nx, y: ny });
    }
  }

  return cells;
}

/**
 * Count 2x2 windows fully inside the region. Since the region is a single
 * color and 4-connected, a 2x2 all-in-region window is a monochrome window.
 */
function countWindows(cells: Array<{ x: number; y: number }>): number {
  const inRegion = new Set(cells.map(c => `${c.x},${c.y}`));
  let windows = 0;
  for (const { x, y } of cells) {
    if (
      inRegion.has(`${x + 1},${y}`) &&
      inRegion.has(`${x},${y + 1}`) &&
      inRegion.has(`${x + 1},${y + 1}`)
    ) {
      windows += 1;
    }
  }
  return windows;
}
```

- [ ] **Step 4: Export from `index.ts`**

Add to `src/utils/placementMetrics/index.ts`:

```ts
export { computeRegionEfficiency } from './regionEfficiency';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/utils/placementMetrics/__tests__/regionEfficiency.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/placementMetrics/regionEfficiency.ts src/utils/placementMetrics/__tests__/regionEfficiency.test.ts src/utils/placementMetrics/index.ts
git commit -m "feat(metrics): computeRegionEfficiency for square-vs-strip efficiency"
```

---

### Task 3: Well profile (intuition 3 — narrow tall towers / gaps)

**Files:**
- Create: `src/utils/placementMetrics/wellProfile.ts`
- Test: `src/utils/placementMetrics/__tests__/wellProfile.test.ts`
- Modify: `src/utils/placementMetrics/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/placementMetrics/__tests__/wellProfile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeWellProfile } from '../wellProfile';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

// Fill a column from the bottom up to the given height.
function stackColumn(board: GameBoard, x: number, height: number): void {
  for (let y = BOARD_HEIGHT - 1; y >= BOARD_HEIGHT - height; y--) {
    board[y][x] = 1;
  }
}

describe('computeWellProfile', () => {
  it('is flat and well-free for an empty board', () => {
    const r = computeWellProfile(emptyBoard());
    expect(r.heights).toHaveLength(BOARD_WIDTH);
    expect(r.bumpiness).toBe(0);
    expect(r.maxWellDepth).toBe(0);
    expect(r.deepWellCount).toBe(0);
  });

  it('measures the depth of a 1-wide gap between two tall stacks', () => {
    const board = emptyBoard();
    stackColumn(board, 4, 6);
    stackColumn(board, 6, 6);
    // column 5 is an empty 1-wide well of depth 6
    const r = computeWellProfile(board);
    expect(r.heights[5]).toBe(0);
    expect(r.maxWellDepth).toBe(6);
    expect(r.deepWellCount).toBe(1); // depth >= 3 default threshold
  });

  it('treats an edge gap next to a tall stack as a well (wall = full height)', () => {
    const board = emptyBoard();
    stackColumn(board, 1, 5);
    // column 0 is flanked by the left wall (full height) and a height-5 stack
    const r = computeWellProfile(board);
    expect(r.maxWellDepth).toBe(5);
  });

  it('reports bumpiness as summed adjacent height differences', () => {
    const board = emptyBoard();
    stackColumn(board, 0, 2);
    stackColumn(board, 1, 5);
    const r = computeWellProfile(board);
    // |2-5| + |5-0| + 0... = 3 + 5 = 8
    expect(r.bumpiness).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/placementMetrics/__tests__/wellProfile.test.ts`
Expected: FAIL — cannot find module `../wellProfile`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/placementMetrics/wellProfile.ts`:

```ts
import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { GameBoard } from '@/types/game';

import type { WellProfile } from './types';

const DEFAULT_DEEP_WELL_THRESHOLD = 3;

/**
 * Surface roughness of the stack. A 1-wide column can never form a 2x2 by
 * itself and a deep narrow well cannot be filled before the sweep arrives, so
 * deep wells and high bumpiness are the measurable form of "don't build narrow
 * towers / gaps". Walls count as full-height neighbours, so an edge gap beside
 * a tall stack is a real well.
 */
export function computeWellProfile(
  board: GameBoard,
  deepWellThreshold: number = DEFAULT_DEEP_WELL_THRESHOLD
): WellProfile {
  const heights = columnHeights(board);

  let bumpiness = 0;
  for (let x = 0; x < BOARD_WIDTH - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1]);
  }

  let maxWellDepth = 0;
  let deepWellCount = 0;
  for (let x = 0; x < BOARD_WIDTH; x++) {
    const left = x === 0 ? BOARD_HEIGHT : heights[x - 1];
    const right = x === BOARD_WIDTH - 1 ? BOARD_HEIGHT : heights[x + 1];
    const depth = Math.max(0, Math.min(left, right) - heights[x]);
    if (depth > maxWellDepth) {
      maxWellDepth = depth;
    }
    if (depth >= deepWellThreshold) {
      deepWellCount += 1;
    }
  }

  return { heights, bumpiness, maxWellDepth, deepWellCount };
}

function columnHeights(board: GameBoard): number[] {
  const heights: number[] = [];
  for (let x = 0; x < BOARD_WIDTH; x++) {
    let height = 0;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y][x] !== 0) {
        height = BOARD_HEIGHT - y;
        break;
      }
    }
    heights.push(height);
  }
  return heights;
}
```

- [ ] **Step 4: Export from `index.ts`**

Add to `src/utils/placementMetrics/index.ts`:

```ts
export { computeWellProfile } from './wellProfile';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/utils/placementMetrics/__tests__/wellProfile.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/placementMetrics/wellProfile.ts src/utils/placementMetrics/__tests__/wellProfile.test.ts src/utils/placementMetrics/index.ts
git commit -m "feat(metrics): computeWellProfile for narrow-well/bumpiness risk"
```

---

### Task 4: Frozen growth (intuition 2 — don't seal color too early)

**Files:**
- Create: `src/utils/placementMetrics/frozenGrowth.ts`
- Test: `src/utils/placementMetrics/__tests__/frozenGrowth.test.ts`
- Modify: `src/utils/placementMetrics/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/placementMetrics/__tests__/frozenGrowth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeFrozenGrowth } from '../frozenGrowth';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

describe('computeFrozenGrowth', () => {
  it('has zero seal pressure on an empty board', () => {
    const r = computeFrozenGrowth(emptyBoard());
    expect(r.sealPressure.light).toBe(0);
    expect(r.sealPressure.dark).toBe(0);
  });

  it('counts an open window where a light pair can still close monochrome', () => {
    const board = emptyBoard();
    board[8][4] = 1;
    board[9][4] = 1; // two light cells, neighbours empty
    const r = computeFrozenGrowth(board);
    expect(r.open.light).toBeGreaterThan(0);
    expect(r.blocked.light).toBe(0);
    expect(r.sealPressure.light).toBe(0);
  });

  it('counts a window blocked for light when the opposite color contaminates it', () => {
    const board = emptyBoard();
    board[8][4] = 1;
    board[8][5] = 2; // dark next to light in the same 2x2 window
    const r = computeFrozenGrowth(board);
    expect(r.blocked.light).toBeGreaterThan(0);
    expect(r.sealPressure.light).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/placementMetrics/__tests__/frozenGrowth.test.ts`
Expected: FAIL — cannot find module `../frozenGrowth`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/placementMetrics/frozenGrowth.ts`:

```ts
import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import type { FrozenGrowthResult } from './types';

type ColorKey = 'light' | 'dark';

/**
 * Board-level "sealing" pressure per color. Generalizes deadCells (a cell whose
 * every window is blocked) to a continuous measure: for each color, how many
 * 2x2 windows can still close monochrome (open) vs. are contaminated by the
 * opposite color (blocked). High sealPressure means that color's combos can no
 * longer grow — the measurable form of "don't seal a color too early".
 */
export function computeFrozenGrowth(board: GameBoard): FrozenGrowthResult {
  const open = { light: 0, dark: 0 };
  const blocked = { light: 0, dark: 0 };

  for (let wy = 0; wy < BOARD_HEIGHT - 1; wy++) {
    for (let wx = 0; wx < BOARD_WIDTH - 1; wx++) {
      classifyWindow(board, wx, wy, 1, open, blocked);
      classifyWindow(board, wx, wy, 2, open, blocked);
    }
  }

  return {
    open,
    blocked,
    sealPressure: {
      light: pressure(open.light, blocked.light),
      dark: pressure(open.dark, blocked.dark),
    },
  };
}

function classifyWindow(
  board: GameBoard,
  wx: number,
  wy: number,
  color: CellValue,
  open: Record<ColorKey, number>,
  blocked: Record<ColorKey, number>
): void {
  let hasColor = false;
  let hasEmpty = false;
  let hasOpposite = false;

  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const c = board[wy + dy][wx + dx];
      if (c === 0) {
        hasEmpty = true;
      } else if (c === color) {
        hasColor = true;
      } else {
        hasOpposite = true;
      }
    }
  }

  const key: ColorKey = color === 1 ? 'light' : 'dark';
  if (hasOpposite) {
    // Contaminated: counts as blocked only if this color had a stake here.
    if (hasColor || hasEmpty) {
      blocked[key] += 1;
    }
  } else if (hasColor && hasEmpty) {
    // Partially built and still able to close monochrome.
    open[key] += 1;
  }
  // all-empty windows (no stake) and complete windows (already a combo) are ignored.
}

function pressure(open: number, blocked: number): number {
  const total = open + blocked;
  return total === 0 ? 0 : blocked / total;
}
```

- [ ] **Step 4: Export from `index.ts`**

Add to `src/utils/placementMetrics/index.ts`:

```ts
export { computeFrozenGrowth } from './frozenGrowth';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/utils/placementMetrics/__tests__/frozenGrowth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/placementMetrics/frozenGrowth.ts src/utils/placementMetrics/__tests__/frozenGrowth.test.ts src/utils/placementMetrics/index.ts
git commit -m "feat(metrics): computeFrozenGrowth for color-sealing pressure"
```

---

### Task 5: Focus rhythm (intuition 1 — one color per round, alternation, hand-off)

**Files:**
- Create: `src/utils/placementMetrics/focusRhythm.ts`
- Test: `src/utils/placementMetrics/__tests__/focusRhythm.test.ts`
- Modify: `src/utils/placementMetrics/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/placementMetrics/__tests__/focusRhythm.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { Square } from '@/types/game';

import {
  computeFocusRhythm,
  summarizePayoutColor,
} from '../focusRhythm';
import type { PayoutColorRecord } from '../types';

function cells(colors: Array<1 | 2>): Square[] {
  return colors.map((color, i) => ({ x: i, y: 0, color }));
}

describe('summarizePayoutColor', () => {
  it('returns the dominant color and its share', () => {
    const r = summarizePayoutColor(cells([1, 1, 1, 2]));
    expect(r.dominantColor).toBe(1);
    expect(r.dominantShare).toBeCloseTo(3 / 4);
  });

  it('returns share 0 for no cleared cells', () => {
    expect(summarizePayoutColor([]).dominantShare).toBe(0);
  });
});

describe('computeFocusRhythm', () => {
  it('is all-zero for no payouts', () => {
    const r = computeFocusRhythm([]);
    expect(r).toEqual({
      payoutCount: 0,
      meanPurity: 0,
      alternationRate: 0,
      handoffRate: 0,
    });
  });

  it('scores perfect alternation and hand-off', () => {
    // clear light -> residual dark (delta<0); clear dark -> residual light (delta>0)
    const records: PayoutColorRecord[] = [
      { dominantColor: 1, dominantShare: 1, postBalanceDelta: -4 },
      { dominantColor: 2, dominantShare: 1, postBalanceDelta: 3 },
      { dominantColor: 1, dominantShare: 1, postBalanceDelta: -2 },
    ];
    const r = computeFocusRhythm(records);
    expect(r.alternationRate).toBe(1);
    expect(r.handoffRate).toBe(1);
    expect(r.meanPurity).toBe(1);
  });

  it('scores zero alternation when the same color repeats', () => {
    const records: PayoutColorRecord[] = [
      { dominantColor: 1, dominantShare: 0.8, postBalanceDelta: 5 },
      { dominantColor: 1, dominantShare: 0.6, postBalanceDelta: 5 },
    ];
    const r = computeFocusRhythm(records);
    expect(r.alternationRate).toBe(0);
    expect(r.handoffRate).toBe(0); // cleared light but residual stayed light-heavy
    expect(r.meanPurity).toBeCloseTo(0.7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/placementMetrics/__tests__/focusRhythm.test.ts`
Expected: FAIL — cannot find module `../focusRhythm`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/placementMetrics/focusRhythm.ts`:

```ts
import type { Square } from '@/types/game';

import type { FocusRhythmStats, PayoutColorRecord } from './types';

/**
 * Reduce a payout's cleared cells to its dominant color and that color's share.
 * Cleared cells come from the pre-payout `markedCells` (each carries its color).
 */
export function summarizePayoutColor(markedCells: Square[]): {
  dominantColor: 1 | 2;
  dominantShare: number;
} {
  let light = 0;
  let dark = 0;
  for (const cell of markedCells) {
    if (cell.color === 1) {
      light += 1;
    } else if (cell.color === 2) {
      dark += 1;
    }
  }
  const total = light + dark;
  if (total === 0) {
    return { dominantColor: 1, dominantShare: 0 };
  }
  return {
    dominantColor: light >= dark ? 1 : 2,
    dominantShare: Math.max(light, dark) / total,
  };
}

/**
 * Aggregate per-payout color records into the three sub-claims of "focus one
 * color per round": purity (each payout is mostly one color), alternation (the
 * dominant color flips round to round), and hand-off (the residual after a
 * payout leans the OTHER color, seeding the next round). light(1) contributes
 * +1 to board balance delta, so a good hand-off is: cleared light -> delta<0,
 * cleared dark -> delta>0.
 */
export function computeFocusRhythm(
  records: PayoutColorRecord[]
): FocusRhythmStats {
  if (records.length === 0) {
    return {
      payoutCount: 0,
      meanPurity: 0,
      alternationRate: 0,
      handoffRate: 0,
    };
  }

  const meanPurity =
    records.reduce((s, r) => s + r.dominantShare, 0) / records.length;

  let flips = 0;
  for (let i = 1; i < records.length; i++) {
    if (records[i].dominantColor !== records[i - 1].dominantColor) {
      flips += 1;
    }
  }
  const alternationRate =
    records.length > 1 ? flips / (records.length - 1) : 0;

  let handoffs = 0;
  for (const r of records) {
    const good =
      (r.dominantColor === 1 && r.postBalanceDelta < 0) ||
      (r.dominantColor === 2 && r.postBalanceDelta > 0);
    if (good) {
      handoffs += 1;
    }
  }
  const handoffRate = handoffs / records.length;

  return {
    payoutCount: records.length,
    meanPurity,
    alternationRate,
    handoffRate,
  };
}
```

- [ ] **Step 4: Export from `index.ts`**

Add to `src/utils/placementMetrics/index.ts`:

```ts
export { computeFocusRhythm, summarizePayoutColor } from './focusRhythm';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/utils/placementMetrics/__tests__/focusRhythm.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/placementMetrics/focusRhythm.ts src/utils/placementMetrics/__tests__/focusRhythm.test.ts src/utils/placementMetrics/index.ts
git commit -m "feat(metrics): computeFocusRhythm for color purity/alternation/hand-off"
```

---

### Task 6: Sweep value (elevate scoreDelta as the value unit)

**Files:**
- Create: `src/utils/placementMetrics/sweepValue.ts`
- Test: `src/utils/placementMetrics/__tests__/sweepValue.test.ts`
- Modify: `src/utils/placementMetrics/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/placementMetrics/__tests__/sweepValue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { computeSweepValue } from '../sweepValue';
import type { SweepEvent } from '../types';

function event(scoreDelta: number): SweepEvent {
  return { frame: 0, clearedCells: 0, scoreDelta, dropsSincePrevious: 0 };
}

describe('computeSweepValue', () => {
  it('returns zeros for no events', () => {
    expect(computeSweepValue([])).toEqual({ totalPoints: 0, meanPoints: 0 });
  });

  it('sums and averages scoreDelta (the real per-payout value)', () => {
    const r = computeSweepValue([event(9), event(3)]);
    expect(r.totalPoints).toBe(12);
    expect(r.meanPoints).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/placementMetrics/__tests__/sweepValue.test.ts`
Expected: FAIL — cannot find module `../sweepValue`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/placementMetrics/sweepValue.ts`:

```ts
import type { SweepEvent, SweepValueStats } from './types';

/**
 * Aggregate payout VALUE (scoreDelta == 2x2-window count paid out), the unit
 * the scoring function actually rewards — distinct from computeSweepYield,
 * which aggregates cleared CELLS. Two payouts clearing equal cells can differ
 * in points by shape, so points is the primary value signal.
 */
export function computeSweepValue(events: SweepEvent[]): SweepValueStats {
  if (events.length === 0) {
    return { totalPoints: 0, meanPoints: 0 };
  }
  const totalPoints = events.reduce((s, e) => s + e.scoreDelta, 0);
  return { totalPoints, meanPoints: totalPoints / events.length };
}
```

- [ ] **Step 4: Export from `index.ts`**

Add to `src/utils/placementMetrics/index.ts`:

```ts
export { computeSweepValue } from './sweepValue';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/utils/placementMetrics/__tests__/sweepValue.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/placementMetrics/sweepValue.ts src/utils/placementMetrics/__tests__/sweepValue.test.ts src/utils/placementMetrics/index.ts
git commit -m "feat(metrics): computeSweepValue aggregating per-payout points"
```

---

### Task 7: Decision regret (the teaching layer)

**Files:**
- Create: `src/utils/placementMetrics/decisionRegret.ts`
- Test: `src/utils/placementMetrics/__tests__/decisionRegret.test.ts`
- Modify: `src/utils/placementMetrics/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/placementMetrics/__tests__/decisionRegret.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { Block, CellValue, GameBoard } from '@/types/game';

import { computeDecisionRegret } from '../decisionRegret';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

function lightBlock(): Block {
  return {
    pattern: [
      [1, 1],
      [1, 1],
    ],
    id: 'test',
    patternIndex: 0,
  };
}

describe('computeDecisionRegret', () => {
  it('has zero regret when the chosen column already maximizes windows', () => {
    // A light pair sitting at the bottom of columns 4-5; dropping the all-light
    // block there completes a 2x2 (and extends), which is optimal.
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1][4] = 1;
    board[BOARD_HEIGHT - 1][5] = 1;
    const r = computeDecisionRegret(board, [], lightBlock(), 4);
    expect(r.regret).toBe(0);
    expect(r.chosenWindows).toBe(r.bestWindows);
  });

  it('reports positive regret when a better column was available', () => {
    // Existing light pair at columns 4-5 bottom. Choosing far-away column 0
    // builds no shared window; column 4 would complete one.
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1][4] = 1;
    board[BOARD_HEIGHT - 1][5] = 1;
    const r = computeDecisionRegret(board, [], lightBlock(), 0);
    expect(r.bestWindows).toBeGreaterThan(r.chosenWindows);
    expect(r.regret).toBeGreaterThan(0);
    expect(r.bestX).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/placementMetrics/__tests__/decisionRegret.test.ts`
Expected: FAIL — cannot find module `../decisionRegret`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/placementMetrics/decisionRegret.ts`:

```ts
import { BOARD_WIDTH } from '@/constants/gameConfig';
import type { Block, BlockPattern, FallingColumn, GameBoard } from '@/types/game';
import {
  detectPatterns,
  findDropPosition,
  placeBlockOnBoard,
  rotateBlockPattern,
} from '@/utils/gameLogic';

import { computeDeadCells } from './deadCells';
import type { DecisionRegretResult } from './types';

/**
 * For a single drop, compare the placement the player chose against the best
 * legal alternative (every column x every rotation), scoring each by the number
 * of internal 2x2 windows it creates — the exact points the resulting board can
 * yield. Regret = bestWindows - chosenWindows. Ties broken toward fewer dead
 * cells. This converts intuition into "you left N points on the table on this
 * move".
 */
export function computeDecisionRegret(
  board: GameBoard,
  fallingColumns: FallingColumn[],
  block: Block,
  chosenX: number
): DecisionRegretResult {
  const chosen = evaluate(board, fallingColumns, block.pattern, chosenX);
  const chosenWindows = chosen?.windows ?? 0;
  const chosenDead = chosen?.dead ?? 0;

  let best = {
    windows: chosenWindows,
    dead: chosenDead,
    x: chosenX,
    rotation: 0,
  };

  let pattern: BlockPattern = block.pattern;
  for (let rotation = 0; rotation < 4; rotation++) {
    if (rotation > 0) {
      pattern = rotateBlockPattern(pattern, true);
    }
    for (let x = 0; x <= BOARD_WIDTH - pattern[0].length; x++) {
      const candidate = evaluate(board, fallingColumns, pattern, x);
      if (!candidate) {
        continue;
      }
      const better =
        candidate.windows > best.windows ||
        (candidate.windows === best.windows && candidate.dead < best.dead);
      if (better) {
        best = { windows: candidate.windows, dead: candidate.dead, x, rotation };
      }
    }
  }

  return {
    regret: best.windows - chosenWindows,
    chosenWindows,
    bestWindows: best.windows,
    bestX: best.x,
    bestRotation: best.rotation,
    chosenDead,
    bestDead: best.dead,
  };
}

function evaluate(
  board: GameBoard,
  fallingColumns: FallingColumn[],
  pattern: BlockPattern,
  x: number
): { windows: number; dead: number } | null {
  if (x < 0 || x + pattern[0].length > BOARD_WIDTH) {
    return null;
  }
  const block: Block = { pattern, id: 'regret', patternIndex: 0 };
  const landing = findDropPosition(board, block, { x, y: -2 }, fallingColumns);
  const result = placeBlockOnBoard(board, fallingColumns, block, landing);
  return {
    windows: detectPatterns(result).length,
    dead: computeDeadCells(result).count,
  };
}
```

- [ ] **Step 4: Export from `index.ts`**

Add to `src/utils/placementMetrics/index.ts`:

```ts
export { computeDecisionRegret } from './decisionRegret';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/utils/placementMetrics/__tests__/decisionRegret.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the whole metrics suite + typecheck**

Run: `pnpm test src/utils/placementMetrics && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/placementMetrics/decisionRegret.ts src/utils/placementMetrics/__tests__/decisionRegret.test.ts src/utils/placementMetrics/index.ts
git commit -m "feat(metrics): computeDecisionRegret comparing chosen vs best placement"
```

---

### Task 8: Spearman rank correlation utility

**Files:**
- Create: `scripts/metrics-corpus/spearman.ts`
- Test: `scripts/metrics-corpus/__tests__/spearman.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/metrics-corpus/__tests__/spearman.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { spearman } from '../spearman';

describe('spearman', () => {
  it('returns 1 for a perfectly increasing monotonic relationship', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
  });

  it('returns -1 for a perfectly decreasing relationship', () => {
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
  });

  it('handles non-linear but monotonic data (rank-based)', () => {
    expect(spearman([1, 2, 3, 4], [1, 4, 9, 16])).toBeCloseTo(1);
  });

  it('averages ranks on ties', () => {
    // ys all equal -> zero variance -> defined as 0
    expect(spearman([1, 2, 3], [5, 5, 5])).toBe(0);
  });

  it('returns 0 for fewer than two points', () => {
    expect(spearman([1], [2])).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test scripts/metrics-corpus/__tests__/spearman.test.ts`
Expected: FAIL — cannot find module `../spearman`.

- [ ] **Step 3: Write the implementation**

Create `scripts/metrics-corpus/spearman.ts`:

```ts
/**
 * Spearman rank correlation: Pearson correlation of the value ranks. Chosen
 * over Pearson because the corpus is small and the metric->score relationships
 * are expected to be monotonic rather than linear. Ties get average ranks.
 * Returns 0 when undefined (n < 2 or zero variance).
 */
export function spearman(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) {
    return 0;
  }
  return pearson(rank(xs), rank(ys));
}

function rank(values: number[]): number[] {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) {
      j += 1;
    }
    const averageRank = (i + j) / 2 + 1; // 1-based average rank for the tie group
    for (let k = i; k <= j; k++) {
      ranks[order[k].i] = averageRank;
    }
    i = j + 1;
  }
  return ranks;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) {
    return 0;
  }
  return num / Math.sqrt(da * db);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test scripts/metrics-corpus/__tests__/spearman.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/metrics-corpus/spearman.ts scripts/metrics-corpus/__tests__/spearman.test.ts
git commit -m "feat(metrics): spearman rank-correlation utility"
```

---

### Task 9: Shared replay simulator + corpus runner (validation)

**Files:**
- Create: `scripts/metrics-corpus/simulateReplay.ts`
- Test: `scripts/metrics-corpus/__tests__/simulateReplay.test.ts`
- Create: `scripts/metrics-corpus.ts` (CLI entry)

- [ ] **Step 1: Write the failing test for the simulator**

This reuses the existing replay fixture the notation tests use. First confirm its path:

Run: `ls src/reducers/__tests__/fixtures`
Expected: a `.json` replay fixture (e.g. used by `scripts/replay-notation/__tests__/notation.test.ts`). Open that test to copy the exact fixture import path it uses:

Run: `grep -n "fixtures\|\.json" scripts/replay-notation/__tests__/notation.test.ts`

Use the **same** fixture path that test uses in the import below (shown here as `<FIXTURE_PATH>`).

Create `scripts/metrics-corpus/__tests__/simulateReplay.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { ReplayData } from '@/types/replay';

import { simulateReplay } from '../simulateReplay';
// Replace with the fixture path used by notation.test.ts:
import replayFixture from '<FIXTURE_PATH>';

describe('simulateReplay', () => {
  it('fires onDrop for every hard drop and reaches the recorded final score', () => {
    const replay = replayFixture as ReplayData;
    let drops = 0;
    let payouts = 0;
    const finalState = simulateReplay(replay, {
      onDrop: () => {
        drops += 1;
      },
      onPayout: () => {
        payouts += 1;
      },
    });
    expect(drops).toBeGreaterThan(0);
    expect(payouts).toBeGreaterThanOrEqual(0);
    expect(finalState.score).toBe(replay.metadata.finalScore);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test scripts/metrics-corpus/__tests__/simulateReplay.test.ts`
Expected: FAIL — cannot find module `../simulateReplay`.

- [ ] **Step 3: Write the simulator**

Create `scripts/metrics-corpus/simulateReplay.ts`:

```ts
import { createInitialGameState, gameReducer } from '@/reducers/gameReducer';
import type { Block, GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { detectPayout } from '@/utils/placementMetrics';
import {
  expandReplayDataWithSnapshots,
  getReplayBlockQueue,
} from '@/utils/replayUtils';

export interface DropContext {
  pre: GameState;
  post: GameState;
  chosenX: number;
  block: Block;
}

export interface PayoutContext {
  pre: GameState;
  post: GameState;
}

export interface SimulateHandlers {
  onDrop?: (ctx: DropContext) => void;
  onPayout?: (ctx: PayoutContext) => void;
}

/**
 * Drive the real gameReducer through a replay (mirrors the simulation loop in
 * scripts/replay-notation/notation.ts) and call hooks on each hard drop and
 * each payout. Returns the final state. Single source of replay simulation for
 * the corpus runner.
 */
export function simulateReplay(
  replay: ReplayData,
  handlers: SimulateHandlers
): GameState {
  const expanded = expandReplayDataWithSnapshots(replay);
  const recordedBlockQueue = getReplayBlockQueue(replay);

  let state: GameState = createInitialGameState(
    replay.seed,
    false,
    'normal',
    recordedBlockQueue
  );
  state = gameReducer(state, { type: 'START_GAME' });
  state = gameReducer(state, { type: 'SKIP_COUNTDOWN' });

  for (const frameData of expanded.frameActions) {
    for (const action of frameData.userActions as GameAction[]) {
      if (action.type === 'HARD_DROP') {
        const pre = state;
        state = gameReducer(state, action);
        handlers.onDrop?.({
          pre,
          post: state,
          chosenX: pre.blockPosition.x,
          block: pre.currentBlock,
        });
      } else {
        state = gameReducer(state, action);
      }
    }
    const preTick = state;
    state = gameReducer(state, { type: 'TICK' });
    if (detectPayout(preTick, state).payout) {
      handlers.onPayout?.({ pre: preTick, post: state });
    }
  }

  return state;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test scripts/metrics-corpus/__tests__/simulateReplay.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Write the corpus runner CLI**

Create `scripts/metrics-corpus.ts`:

```ts
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { ReplayData } from '@/types/replay';
import {
  computeBoardColorBalance,
  computeDecisionRegret,
  computeFocusRhythm,
  computeFrozenGrowth,
  computeRegionEfficiency,
  computeWellProfile,
  summarizePayoutColor,
} from '@/utils/placementMetrics';
import type { PayoutColorRecord } from '@/utils/placementMetrics';
import { validateReplayData } from '@/utils/replayUtils';

import { simulateReplay } from './metrics-corpus/simulateReplay';
import { spearman } from './metrics-corpus/spearman';

interface RunMetrics {
  source: string;
  finalScore: number;
  meanRegionEfficiency: number;
  meanMaxWellDepth: number;
  meanBumpiness: number;
  meanSealPressure: number;
  meanRegret: number;
  alternationRate: number;
  meanPurity: number;
  handoffRate: number;
}

function analyzeReplay(replay: ReplayData, source: string): RunMetrics {
  let drops = 0;
  let sumEfficiency = 0;
  let sumWellDepth = 0;
  let sumBumpiness = 0;
  let sumSealPressure = 0;
  let sumRegret = 0;
  const payoutRecords: PayoutColorRecord[] = [];

  const finalState = simulateReplay(replay, {
    onDrop: ({ pre, post }) => {
      drops += 1;
      sumEfficiency += computeRegionEfficiency(post.board).meanEfficiency;
      const well = computeWellProfile(post.board);
      sumWellDepth += well.maxWellDepth;
      sumBumpiness += well.bumpiness;
      const seal = computeFrozenGrowth(post.board).sealPressure;
      sumSealPressure += (seal.light + seal.dark) / 2;
      sumRegret += computeDecisionRegret(
        pre.board,
        pre.fallingColumns,
        pre.currentBlock,
        pre.blockPosition.x
      ).regret;
    },
    onPayout: ({ pre, post }) => {
      const { dominantColor, dominantShare } = summarizePayoutColor(
        pre.markedCells
      );
      payoutRecords.push({
        dominantColor,
        dominantShare,
        postBalanceDelta: computeBoardColorBalance(post.board).delta,
      });
    },
  });

  const rhythm = computeFocusRhythm(payoutRecords);
  const safeDrops = drops === 0 ? 1 : drops;

  return {
    source,
    finalScore: finalState.score,
    meanRegionEfficiency: sumEfficiency / safeDrops,
    meanMaxWellDepth: sumWellDepth / safeDrops,
    meanBumpiness: sumBumpiness / safeDrops,
    meanSealPressure: sumSealPressure / safeDrops,
    meanRegret: sumRegret / safeDrops,
    alternationRate: rhythm.alternationRate,
    meanPurity: rhythm.meanPurity,
    handoffRate: rhythm.handoffRate,
  };
}

function loadReplay(path: string): ReplayData | null {
  try {
    const replay = JSON.parse(readFileSync(path, 'utf8')) as ReplayData;
    const validation = validateReplayData(replay);
    if (!validation.valid) {
      process.stderr.write(
        `skip ${path}: ${validation.errors.join('; ')}\n`
      );
      return null;
    }
    return replay;
  } catch (err) {
    process.stderr.write(`skip ${path}: ${(err as Error).message}\n`);
    return null;
  }
}

function main(): void {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    process.stderr.write(
      'usage: pnpm tsx scripts/metrics-corpus.ts <replay.json> [more.json ...]\n'
    );
    process.exit(2);
  }

  const runs: RunMetrics[] = [];
  for (const path of paths) {
    const replay = loadReplay(path);
    if (replay) {
      runs.push(analyzeReplay(replay, basename(path)));
    }
  }

  if (runs.length < 2) {
    process.stderr.write(
      `need >= 2 valid replays to correlate; got ${runs.length}\n`
    );
    process.exit(1);
  }

  const scores = runs.map(r => r.finalScore);
  const metricKeys: Array<keyof RunMetrics> = [
    'meanRegionEfficiency',
    'meanMaxWellDepth',
    'meanBumpiness',
    'meanSealPressure',
    'meanRegret',
    'alternationRate',
    'meanPurity',
    'handoffRate',
  ];

  const correlations = metricKeys
    .map(key => ({
      metric: key,
      rho: spearman(
        runs.map(r => r[key] as number),
        scores
      ),
    }))
    .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));

  process.stdout.write(`# Strategy metric vs finalScore (N=${runs.length})\n\n`);
  process.stdout.write('Spearman rho, sorted by |rho| (strongest first):\n\n');
  for (const { metric, rho } of correlations) {
    process.stdout.write(`  ${rho.toFixed(3).padStart(7)}  ${metric}\n`);
  }
  process.stdout.write(
    '\nNote: small/skill-skewed corpus + RNG luck in finalScore — treat as\n' +
      'suggestive, not proof. Metrics stable across seeds are the trustworthy ones.\n'
  );
}

main();
```

- [ ] **Step 6: Verify it typechecks and runs end-to-end on one fixture**

Run: `pnpm typecheck`
Expected: PASS.

Run (uses the fixture twice just to prove the pipeline runs; real use passes many distinct replays):
`pnpm tsx scripts/metrics-corpus.ts <FIXTURE_PATH> <FIXTURE_PATH>`
Expected: prints a ranked Spearman table (rho values will be 0 with identical inputs — that is fine; it proves the pipeline runs).

- [ ] **Step 7: Commit**

```bash
git add scripts/metrics-corpus.ts scripts/metrics-corpus/simulateReplay.ts scripts/metrics-corpus/__tests__/simulateReplay.test.ts
git commit -m "feat(metrics): replay-corpus runner correlating metrics vs finalScore"
```

---

### Task 10: Named pattern detectors + notation integration

**Files:**
- Create: `scripts/replay-notation/detectors.ts`
- Test: `scripts/replay-notation/__tests__/detectors.test.ts`
- Modify: `scripts/replay-notation/notation.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/replay-notation/__tests__/detectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { detectBoardTags } from '../detectors';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

function stackColumn(board: GameBoard, x: number, height: number): void {
  for (let y = BOARD_HEIGHT - 1; y >= BOARD_HEIGHT - height; y--) {
    board[y][x] = 1;
  }
}

describe('detectBoardTags', () => {
  it('emits no tags for an empty board', () => {
    expect(detectBoardTags(emptyBoard())).toEqual([]);
  });

  it('flags a deep narrow well', () => {
    const board = emptyBoard();
    stackColumn(board, 4, 6);
    stackColumn(board, 6, 6); // column 5 is a depth-6 well
    expect(detectBoardTags(board)).toContain('NARROW-WELL');
  });

  it('flags a long thin same-color region as THIN-STACK', () => {
    const board = emptyBoard();
    // a 1-tall x 8-wide light strip: many cells, zero windows -> low efficiency
    for (let x = 0; x < 8; x++) {
      board[BOARD_HEIGHT - 1][x] = 1;
    }
    expect(detectBoardTags(board)).toContain('THIN-STACK');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test scripts/replay-notation/__tests__/detectors.test.ts`
Expected: FAIL — cannot find module `../detectors`.

- [ ] **Step 3: Write the detectors**

Create `scripts/replay-notation/detectors.ts`:

```ts
import type { GameBoard } from '@/types/game';
import {
  computeFrozenGrowth,
  computeRegionEfficiency,
  computeWellProfile,
} from '@/utils/placementMetrics';

export interface DetectorThresholds {
  sealPressure: number;
  narrowWellDepth: number;
  thinRegionCells: number;
  thinEfficiency: number;
}

export const DEFAULT_THRESHOLDS: DetectorThresholds = {
  sealPressure: 0.6,
  narrowWellDepth: 3,
  thinRegionCells: 6,
  thinEfficiency: 0.4,
};

/**
 * Translate board metrics into the player's named-pattern vocabulary so the
 * notation record reads in strategy terms. (MISSED-SQUARE is added separately
 * in notation.ts, since it needs the per-drop decision-regret value.)
 */
export function detectBoardTags(
  board: GameBoard,
  thresholds: DetectorThresholds = DEFAULT_THRESHOLDS
): string[] {
  const tags: string[] = [];

  const seal = computeFrozenGrowth(board).sealPressure;
  if (seal.light >= thresholds.sealPressure) {
    tags.push('SEALED-COLOR(L)');
  }
  if (seal.dark >= thresholds.sealPressure) {
    tags.push('SEALED-COLOR(D)');
  }

  if (computeWellProfile(board).maxWellDepth >= thresholds.narrowWellDepth) {
    tags.push('NARROW-WELL');
  }

  const thin = computeRegionEfficiency(board).regions.some(
    r =>
      r.cells >= thresholds.thinRegionCells &&
      r.efficiency < thresholds.thinEfficiency
  );
  if (thin) {
    tags.push('THIN-STACK');
  }

  return tags;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test scripts/replay-notation/__tests__/detectors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Integrate tags into notation drop lines**

In `scripts/replay-notation/notation.ts`:

(a) Add to the imports from `@/utils/placementMetrics` the `computeDecisionRegret` function — change the existing import block to include it:

```ts
import {
  computeBoardColorBalance,
  computeDeadCells,
  computeDecisionRegret,
  computeSweepYield,
  type SweepEvent,
} from '@/utils/placementMetrics';
```

(b) Add a new import near the `detectSweepEvent` import:

```ts
import { detectBoardTags } from './detectors';
```

(c) Inside the `HARD_DROP` branch, after the existing `const dead = computeDeadCells(state.board).count;` line, compute the tags and append them to the drop annotation. Replace the existing block:

```ts
        const dropLine = formatDropLine({
          seq: dropCount,
          frame: preDrop.frame,
          columnX: preDrop.blockPosition.x,
          sweepX: preDrop.timeline.x,
        });
        chapterLines.push(
          `${dropLine}  // ${formatDropAnnotation({ pspDelta, balance, dead })}`
        );
```

with:

```ts
        const tags = detectBoardTags(state.board);
        const regret = computeDecisionRegret(
          preDrop.board,
          preDrop.fallingColumns,
          preDrop.currentBlock,
          preDrop.blockPosition.x
        ).regret;
        if (regret > 0) {
          tags.push(`MISSED-SQUARE(-${regret})`);
        }

        const dropLine = formatDropLine({
          seq: dropCount,
          frame: preDrop.frame,
          columnX: preDrop.blockPosition.x,
          sweepX: preDrop.timeline.x,
        });
        const tagSuffix = tags.length > 0 ? `  [${tags.join(' ')}]` : '';
        chapterLines.push(
          `${dropLine}  // ${formatDropAnnotation({ pspDelta, balance, dead })}${tagSuffix}`
        );
```

- [ ] **Step 6: Verify notation still works and its tests pass**

Run: `pnpm test scripts/replay-notation && pnpm typecheck`
Expected: PASS (existing notation tests still green; new detectors tests green).

Run end-to-end to eyeball the tags in real output:
`pnpm tsx scripts/replay-to-notation.ts <FIXTURE_PATH>`
Expected: markdown output where some drop lines now carry `[NARROW-WELL ...]` / `[MISSED-SQUARE(-N)]` suffixes.

- [ ] **Step 7: Commit**

```bash
git add scripts/replay-notation/detectors.ts scripts/replay-notation/__tests__/detectors.test.ts scripts/replay-notation/notation.ts
git commit -m "feat(notation): named strategy-pattern detectors on drop lines"
```

---

### Task 11: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `pnpm test`
Expected: PASS — all suites green, including the four new metric tests, spearman, simulateReplay, and detectors.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS (lint auto-fixes formatting; re-stage if it changes files).

- [ ] **Step 3: Commit any lint fixups (only if files changed)**

```bash
git add -A
git commit -m "chore: lint fixups for strategy metrics" || echo "nothing to commit"
```

---

## Notes for the implementer

- **Fixture path:** Tasks 9 and 10 reference `<FIXTURE_PATH>` — a real v2 replay JSON. Find the one the existing `scripts/replay-notation/__tests__/notation.test.ts` already imports and reuse it; do not invent a new fixture.
- **Scoring is the ground truth:** every "value" in this work is `detectPatterns(board).length` (internal 2×2 windows) / `scoreDelta`, never cleared-cell count. Don't substitute cell counts.
- **Purity of the metric modules:** everything under `src/utils/placementMetrics/` is a pure function of its inputs — no reducer, no I/O. Reducer-driven simulation lives only in `scripts/`.
- **Presentation is out of scope:** no HUD, no UI, no strategy document in this plan. The deliverables are validated metric functions, the corpus correlation report, and notation tags.
