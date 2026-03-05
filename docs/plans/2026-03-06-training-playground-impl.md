# Training Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/training` route where blocks don't auto-fall, the timeline doesn't auto-sweep, the player can hard-drop freely, undo placements, and trigger a manual sweep — with a live HUD showing chain lengths, combo efficiency, and board overlays for cell contributions and column distances.

**Architecture:** Add `mode: 'normal' | 'training'` and `undoStack: GameState[]` to `GameState`. Training mode is a behaviour diff in the existing reducer: `TICK` skips drop and timeline; `HARD_DROP` saves a snapshot; two new actions (`MANUAL_SWEEP`, `UNDO`) handle training-only operations. A new `TrainingScreen` wraps `GameCore` with a `TrainingHUD` sidebar and training-specific keyboard bindings.

**Tech Stack:** React + TypeScript, Vitest, Tailwind CSS, existing game hooks (`useGame`, `useGameLoop`, `useGameControls`, `useResponsiveScale`).

---

## Task 1: Extend types

**Files:**
- Modify: `src/types/game.ts`

**Step 1: Add new action types and state fields**

In `src/types/game.ts`:

1. Add `'MANUAL_SWEEP'` and `'UNDO'` to `GameActionType` union (line 63–77):
```ts
  | 'MANUAL_SWEEP' // Training: trigger full left-to-right sweep
  | 'UNDO';        // Training: restore state before last placement
```

2. Add `mode` and `undoStack` fields to `GameState` interface (after `debugMode` on line 127):
```ts
  // Training mode
  mode: 'normal' | 'training';
  undoStack: GameState[]; // max 20 entries; snapshots never include undoStack themselves
```

**Step 2: Run typecheck to see expected errors cascade**

```bash
pnpm typecheck 2>&1 | head -30
```
Expected: errors in `initialState.ts` (missing `mode`, `undoStack`) — that's fine, we'll fix next.

**Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat(training): add mode and undoStack to GameState types"
```

---

## Task 2: Update initial state

**Files:**
- Modify: `src/reducers/gameState/initialState.ts`

**Step 1: Add `mode` parameter and new fields**

Change `createInitialGameState` signature to accept an optional `mode` param and add the new fields:

```ts
export function createInitialGameState(
  seed: string | undefined,
  debugMode: boolean = false,
  mode: 'normal' | 'training' = 'normal'
): GameState {
```

Inside the returned object (after `debugMode`), add:
```ts
    // Training mode
    mode,
    undoStack: [],
```

**Step 2: Run typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```
Expected: clean (or remaining errors only in training.ts which doesn't exist yet).

**Step 3: Commit**

```bash
git add src/reducers/gameState/initialState.ts
git commit -m "feat(training): add mode and undoStack to initial game state"
```

---

## Task 3: Training tick behaviour — skip drop and timeline

**Files:**
- Modify: `src/reducers/actions/gameTick.ts`

**Step 1: Write the failing test**

Create `src/reducers/__tests__/gameReducer.training.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { gameReducer } from '@/reducers/gameReducer';
import { createInitialGameState } from '@/reducers/gameState/initialState';

function makeTrainingState() {
  const s = createInitialGameState('test-seed', false, 'training');
  return { ...s, status: 'playing' as const };
}

describe('training mode tick', () => {
  it('does not advance the timeline when mode is training', () => {
    const state = makeTrainingState();
    const initialTimelineX = state.timeline.x;

    // Run enough ticks to normally advance the timeline
    let s = state;
    for (let i = 0; i < state.timeline.sweepInterval + 5; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.timeline.x).toBe(initialTimelineX);
  });

  it('does not auto-drop the block when mode is training', () => {
    const state = makeTrainingState();
    const initialY = state.blockPosition.y;

    let s = state;
    for (let i = 0; i < state.dropInterval + 5; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.blockPosition.y).toBe(initialY);
  });

  it('does not count down game timer when mode is training', () => {
    const state = makeTrainingState();
    const initialTimer = state.gameTimer;

    let s = state;
    for (let i = 0; i < 10; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.gameTimer).toBe(initialTimer);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/reducers/__tests__/gameReducer.training.test.ts
```
Expected: FAIL — timeline and block still advance in training mode.

**Step 3: Implement training mode tick guard**

In `src/reducers/actions/gameTick.ts`:

In `handleCountdownAndTimer` (line 65), add an early return for training:
```ts
export function handleCountdownAndTimer(state: GameState): GameState {
  // Training mode: no game timer, skip countdown progression
  if (state.mode === 'training') {
    return { ...state, frame: state.frame + 1 };
  }
  // ... existing logic
```

In `handleGameTick` (line 139), guard drop and timeline:
```ts
export function handleGameTick(
  state: GameState,
  rng: SeededRNGType
): GameState {
  let newState = handleCountdownAndTimer(state);

  if (newState.status !== 'playing') {
    return newState;
  }

  // Training mode: only update frame and falling columns (for gravity after sweep/undo)
  if (newState.mode === 'training') {
    newState = updatePatternDetection(newState);
    const { newBoard, newFallingColumns } = updateFallingColumns(
      newState.board,
      newState.fallingColumns
    );
    return { ...newState, board: newBoard, fallingColumns: newFallingColumns };
  }

  // Normal mode: full tick
  newState = handleBlockDrop(newState, newState.frame, rng);
  newState = updatePatternDetection(newState);
  newState = updateTimeline(newState);
  const { newBoard, newFallingColumns } = updateFallingColumns(
    newState.board,
    newState.fallingColumns
  );
  return { ...newState, board: newBoard, fallingColumns: newFallingColumns };
}
```

Note: the original `handleGameTick` body at lines 152–172 should be replaced by this.

**Step 4: Run test to verify it passes**

```bash
pnpm test src/reducers/__tests__/gameReducer.training.test.ts
```
Expected: all 3 tests PASS.

**Step 5: Run full test suite**

```bash
pnpm test
```
Expected: all existing tests still pass.

**Step 6: Commit**

```bash
git add src/reducers/actions/gameTick.ts src/reducers/__tests__/gameReducer.training.test.ts
git commit -m "feat(training): skip drop and timeline in training mode TICK"
```

---

## Task 4: Save undo snapshot on HARD_DROP in training mode

**Files:**
- Modify: `src/reducers/actions/placement.ts`

**Step 1: Add failing test (append to `gameReducer.training.test.ts`)**

```ts
describe('training mode undo stack', () => {
  it('pushes a snapshot to undoStack on HARD_DROP in training mode', () => {
    const state = makeTrainingState();
    expect(state.undoStack).toHaveLength(0);

    const after = gameReducer(state, { type: 'HARD_DROP' });

    expect(after.undoStack).toHaveLength(1);
    // Snapshot should not contain its own undo stack
    expect(after.undoStack[0].undoStack).toHaveLength(0);
  });

  it('does not push undo snapshot in normal mode', () => {
    const state = {
      ...createInitialGameState('test-seed', false, 'normal'),
      status: 'playing' as const,
    };
    const after = gameReducer(state, { type: 'HARD_DROP' });
    expect(after.undoStack).toHaveLength(0);
  });

  it('caps undoStack at 20 entries', () => {
    let s = makeTrainingState();
    // Drop 25 blocks
    for (let i = 0; i < 25; i++) {
      s = gameReducer(s, { type: 'HARD_DROP' });
      if (s.status === 'gameOver') break;
    }
    expect(s.undoStack.length).toBeLessThanOrEqual(20);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/reducers/__tests__/gameReducer.training.test.ts
```
Expected: FAIL — undoStack not growing.

**Step 3: Add snapshot logic in handleHardDrop**

In `src/reducers/actions/placement.ts`, modify `handleHardDrop`:

```ts
export function handleHardDrop(
  state: GameState,
  rng: SeededRNGType
): GameState {
  if (!isPlayingState(state)) {
    return state;
  }

  // Training mode: save snapshot before placement (exclude undoStack to avoid nesting)
  let stateToProcess = state;
  if (state.mode === 'training') {
    const snapshot: GameState = { ...state, undoStack: [] };
    const newUndoStack = [...state.undoStack, snapshot].slice(-20); // cap at 20
    stateToProcess = { ...state, undoStack: newUndoStack };
  }

  const dropPosition = findDropPosition(
    stateToProcess.board,
    stateToProcess.currentBlock,
    stateToProcess.blockPosition,
    stateToProcess.fallingColumns
  );
  const newState = { ...stateToProcess, blockPosition: dropPosition };
  return placeBlockAndApplyPhysics(newState, newState.frame, rng);
}
```

**Step 4: Run tests**

```bash
pnpm test src/reducers/__tests__/gameReducer.training.test.ts
```
Expected: all undo stack tests PASS.

**Step 5: Run full suite**

```bash
pnpm test
```
Expected: all pass.

**Step 6: Commit**

```bash
git add src/reducers/actions/placement.ts src/reducers/__tests__/gameReducer.training.test.ts
git commit -m "feat(training): save undo snapshot on HARD_DROP in training mode"
```

---

## Task 5: MANUAL_SWEEP and UNDO actions

**Files:**
- Create: `src/reducers/actions/training.ts`
- Modify: `src/reducers/actions/index.ts`
- Modify: `src/reducers/gameReducer.ts`

**Step 1: Add failing tests (append to `gameReducer.training.test.ts`)**

```ts
describe('MANUAL_SWEEP', () => {
  it('clears all detected patterns and updates score', () => {
    // Build a state with a known pattern on the board
    const s = makeTrainingState();
    // Place 2x2 same-color block manually by setting board cells
    const board = s.board.map(row => [...row]);
    board[8][0] = 1; board[8][1] = 1;
    board[9][0] = 1; board[9][1] = 1;
    const stateWithPattern = gameReducer(
      { ...s, board },
      { type: 'TICK' }
    );
    expect(stateWithPattern.detectedPatterns.length).toBeGreaterThan(0);

    const swept = gameReducer(stateWithPattern, { type: 'MANUAL_SWEEP' });

    expect(swept.detectedPatterns).toHaveLength(0);
    expect(swept.score).toBeGreaterThan(0);
    expect(swept.markedCells).toHaveLength(0);
  });

  it('is a no-op when no patterns exist', () => {
    const s = makeTrainingState();
    const swept = gameReducer(s, { type: 'MANUAL_SWEEP' });
    expect(swept).toBe(s); // same reference = no change
  });
});

describe('UNDO', () => {
  it('restores state to before last hard drop', () => {
    const s = makeTrainingState();
    const boardBefore = s.board;
    const afterDrop = gameReducer(s, { type: 'HARD_DROP' });
    const afterUndo = gameReducer(afterDrop, { type: 'UNDO' });

    expect(afterUndo.board).toEqual(boardBefore);
    expect(afterUndo.undoStack).toHaveLength(0);
  });

  it('is a no-op when undoStack is empty', () => {
    const s = makeTrainingState();
    const result = gameReducer(s, { type: 'UNDO' });
    expect(result).toBe(s);
  });
});
```

**Step 2: Run to verify fails**

```bash
pnpm test src/reducers/__tests__/gameReducer.training.test.ts
```
Expected: FAIL — `MANUAL_SWEEP` and `UNDO` fall into `default` case.

**Step 3: Create `src/reducers/actions/training.ts`**

```ts
import type { GameState } from '@/types/game';
import { detectPatterns } from '@/utils/gameLogic/patterns';
import { clearMarkedCellsAndApplyGravity } from '@/utils/gameLogic/physics';

/**
 * Handle MANUAL_SWEEP: mark all detected pattern cells and clear them immediately.
 * Equivalent to a full timeline pass in training mode.
 */
export function handleManualSweep(state: GameState): GameState {
  if (state.detectedPatterns.length === 0) {
    return state;
  }

  // Collect all unique cells from all detected patterns
  const markedSet = new Set<string>();
  const markedCells: typeof state.markedCells = [];

  for (const pattern of state.detectedPatterns) {
    const cells = [
      { x: pattern.x,     y: pattern.y,     color: pattern.color },
      { x: pattern.x + 1, y: pattern.y,     color: pattern.color },
      { x: pattern.x,     y: pattern.y + 1, color: pattern.color },
      { x: pattern.x + 1, y: pattern.y + 1, color: pattern.color },
    ];
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      if (!markedSet.has(key)) {
        markedCells.push(cell);
        markedSet.add(key);
      }
    }
  }

  const { newBoard, newFallingColumns } = clearMarkedCellsAndApplyGravity(
    state.board,
    markedCells,
    state.fallingColumns
  );

  const detectedPatterns = detectPatterns(newBoard);

  return {
    ...state,
    board: newBoard,
    fallingColumns: newFallingColumns,
    detectedPatterns,
    markedCells: [],
    score: state.score + state.detectedPatterns.length,
    timeline: { ...state.timeline, holdingScore: 0 },
  };
}

/**
 * Handle UNDO: restore the last snapshot from undoStack, preserving current undoStack
 * minus the restored entry, and current debugMode.
 */
export function handleUndo(state: GameState): GameState {
  if (state.undoStack.length === 0) {
    return state;
  }

  const snapshot = state.undoStack[state.undoStack.length - 1];
  const remainingStack = state.undoStack.slice(0, -1);

  return {
    ...snapshot,
    undoStack: remainingStack,
    debugMode: state.debugMode,
  };
}
```

**Step 4: Export from `src/reducers/actions/index.ts`**

Add at the bottom:
```ts
// Training actions
export { handleManualSweep, handleUndo } from './training';
```

**Step 5: Wire into reducer**

In `src/reducers/gameReducer.ts`:

1. Import `handleManualSweep` and `handleUndo`:
```ts
import {
  // ...existing imports...
  handleManualSweep,
  handleUndo,
} from './actions';
```

2. Add cases in the switch (after `case 'TICK'`):
```ts
    case 'MANUAL_SWEEP':
      return handleManualSweep(state);

    case 'UNDO':
      return handleUndo(state);
```

**Step 6: Run tests**

```bash
pnpm test src/reducers/__tests__/gameReducer.training.test.ts
```
Expected: all tests PASS.

**Step 7: Run full suite**

```bash
pnpm test
```
Expected: all pass.

**Step 8: Commit**

```bash
git add src/reducers/actions/training.ts src/reducers/actions/index.ts src/reducers/gameReducer.ts src/reducers/__tests__/gameReducer.training.test.ts
git commit -m "feat(training): add MANUAL_SWEEP and UNDO reducer actions"
```

---

## Task 6: Training metrics utility

**Files:**
- Create: `src/utils/trainingMetrics.ts`
- Create: `src/utils/__tests__/trainingMetrics.test.ts`

**Step 1: Write the failing tests**

Create `src/utils/__tests__/trainingMetrics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  computeChainLengths,
  computeCellContributions,
  computeComboGroups,
  computeColumnDistances,
  type ComboGroup,
} from '@/utils/trainingMetrics';
import type { Square } from '@/types/game';

describe('computeColumnDistances', () => {
  it('returns 0 for columns 7 and 8 (center of 16-wide board)', () => {
    const distances = computeColumnDistances(16);
    expect(distances[7]).toBe(0);
    expect(distances[8]).toBe(0);
  });

  it('returns 7 for columns 0 and 15 (edges)', () => {
    const distances = computeColumnDistances(16);
    expect(distances[0]).toBe(7);
    expect(distances[15]).toBe(7);
  });

  it('returns monotonically increasing distances toward the edges', () => {
    const distances = computeColumnDistances(16);
    // Left half: distances[7] <= distances[6] <= ... <= distances[0]
    for (let col = 6; col >= 0; col--) {
      expect(distances[col]).toBeGreaterThanOrEqual(distances[col + 1]);
    }
  });
});

describe('computeChainLengths', () => {
  it('returns 0,0 for empty patterns', () => {
    const result = computeChainLengths([]);
    expect(result).toEqual({ light: 0, dark: 0 });
  });

  it('counts a horizontal chain of light patterns', () => {
    // 3 light patterns at (0,0), (1,0), (2,0) — each at y=0, consecutive columns
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 0, color: 1 },
      { x: 2, y: 0, color: 1 },
    ];
    const result = computeChainLengths(patterns);
    expect(result.light).toBe(3);
    expect(result.dark).toBe(0);
  });

  it('does not count non-adjacent patterns as a chain', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 5, y: 0, color: 1 }, // gap of 4 columns
    ];
    const result = computeChainLengths(patterns);
    expect(result.light).toBe(1);
  });

  it('counts patterns that are adjacent within 1 row (diagonal chain)', () => {
    // (0,0) → (1,1): y diff is 1, should still count as chain
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 1, color: 1 },
      { x: 2, y: 0, color: 1 },
    ];
    const result = computeChainLengths(patterns);
    expect(result.light).toBe(3);
  });
});

describe('computeCellContributions', () => {
  it('returns empty map for no patterns', () => {
    const result = computeCellContributions([]);
    expect(result.size).toBe(0);
  });

  it('counts 1 for a cell belonging to exactly 1 pattern', () => {
    const patterns: Square[] = [{ x: 0, y: 0, color: 1 }];
    const result = computeCellContributions(patterns);
    // Pattern at (0,0) covers cells (0,0), (1,0), (0,1), (1,1) — each contributes to 1 pattern
    expect(result.get('0,0')).toBe(1);
    expect(result.get('1,0')).toBe(1);
  });

  it('counts 2 for a shared edge cell between two horizontally adjacent patterns', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 }, // covers cols 0-1
      { x: 1, y: 0, color: 1 }, // covers cols 1-2 — col 1 is shared
    ];
    const result = computeCellContributions(patterns);
    // Column 1 cells are shared by both patterns
    expect(result.get('1,0')).toBe(2);
    expect(result.get('1,1')).toBe(2);
    // Column 0 is only in first pattern
    expect(result.get('0,0')).toBe(1);
    // Column 2 is only in second pattern
    expect(result.get('2,0')).toBe(1);
  });
});

describe('computeComboGroups', () => {
  it('returns empty array for no patterns', () => {
    expect(computeComboGroups([])).toHaveLength(0);
  });

  it('groups two adjacent same-color patterns as one combo', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 0, color: 1 },
    ];
    const groups = computeComboGroups(patterns);
    expect(groups).toHaveLength(1);
    expect(groups[0].patternCount).toBe(2);
    expect(groups[0].cellCount).toBe(6); // 3 cols × 2 rows
    expect(groups[0].efficiency).toBeCloseTo(2 / 6);
  });

  it('separates non-adjacent same-color patterns as different combos', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 5, y: 0, color: 1 }, // gap — not adjacent
    ];
    const groups = computeComboGroups(patterns);
    expect(groups).toHaveLength(2);
  });

  it('separates patterns of different colors into different combos', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 0, color: 2 }, // different color, adjacent
    ];
    const groups = computeComboGroups(patterns);
    expect(groups).toHaveLength(2);
  });
});
```

**Step 2: Run to verify fails**

```bash
pnpm test src/utils/__tests__/trainingMetrics.test.ts
```
Expected: FAIL — module doesn't exist.

**Step 3: Create `src/utils/trainingMetrics.ts`**

```ts
import type { Square } from '@/types/game';

export interface ComboGroup {
  color: 1 | 2;
  patternCount: number;
  cellCount: number;
  efficiency: number; // patternCount / cellCount
}

/**
 * Compute distance of each column from the board center.
 * Center columns (7 and 8 for a 16-wide board) = 0.
 * Edge columns = 7.
 */
export function computeColumnDistances(boardWidth: number): number[] {
  const center = (boardWidth - 1) / 2; // 7.5 for 16-wide board
  return Array.from({ length: boardWidth }, (_, col) =>
    Math.round(Math.abs(col - center))
  );
}

/**
 * Compute the longest horizontal chain length per color using DP.
 * A chain extends to the next column if it has a pattern of the same color
 * within 1 row of the predecessor pattern's y position.
 */
export function computeChainLengths(
  patterns: Square[]
): { light: number; dark: number } {
  if (patterns.length === 0) return { light: 0, dark: 0 };

  const byColor: Record<1 | 2, Square[]> = { 1: [], 2: [] };
  for (const p of patterns) {
    if (p.color === 1 || p.color === 2) {
      byColor[p.color].push(p);
    }
  }

  function longestChain(colorPatterns: Square[]): number {
    if (colorPatterns.length === 0) return 0;

    // Sort by column then row
    const sorted = [...colorPatterns].sort((a, b) =>
      a.x !== b.x ? a.x - b.x : a.y - b.y
    );

    // dp[i] = longest chain ending at pattern i
    const dp = sorted.map(() => 1);

    for (let i = 1; i < sorted.length; i++) {
      for (let j = i - 1; j >= 0; j--) {
        const colDiff = sorted[i].x - sorted[j].x;
        if (colDiff > 1) break; // sorted by col, can stop early
        if (colDiff === 1 && Math.abs(sorted[i].y - sorted[j].y) <= 1) {
          dp[i] = Math.max(dp[i], dp[j] + 1);
        }
      }
    }

    return Math.max(...dp);
  }

  return {
    light: longestChain(byColor[1]),
    dark: longestChain(byColor[2]),
  };
}

/**
 * For each cell covered by detected patterns, count how many patterns include it.
 * Returns a Map keyed by "x,y" strings.
 */
export function computeCellContributions(
  patterns: Square[]
): Map<string, number> {
  const contributions = new Map<string, number>();

  for (const p of patterns) {
    const cells = [
      `${p.x},${p.y}`,
      `${p.x + 1},${p.y}`,
      `${p.x},${p.y + 1}`,
      `${p.x + 1},${p.y + 1}`,
    ];
    for (const key of cells) {
      contributions.set(key, (contributions.get(key) ?? 0) + 1);
    }
  }

  return contributions;
}

/**
 * Group adjacent same-color patterns into combo groups using flood fill.
 * Two patterns are adjacent if they share at least one cell (i.e., x/y differ by ≤1).
 */
export function computeComboGroups(patterns: Square[]): ComboGroup[] {
  if (patterns.length === 0) return [];

  const visited = new Set<number>();
  const groups: ComboGroup[] = [];

  function cellsOfPattern(p: Square): string[] {
    return [
      `${p.x},${p.y}`,
      `${p.x + 1},${p.y}`,
      `${p.x},${p.y + 1}`,
      `${p.x + 1},${p.y + 1}`,
    ];
  }

  function patternsShareCell(a: Square, b: Square): boolean {
    const aSet = new Set(cellsOfPattern(a));
    return cellsOfPattern(b).some(c => aSet.has(c));
  }

  for (let i = 0; i < patterns.length; i++) {
    if (visited.has(i)) continue;

    // BFS flood fill
    const queue = [i];
    const groupIndices: number[] = [];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.shift()!;
      groupIndices.push(idx);

      for (let j = 0; j < patterns.length; j++) {
        if (
          !visited.has(j) &&
          patterns[j].color === patterns[i].color &&
          patternsShareCell(patterns[idx], patterns[j])
        ) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    // Calculate group metrics
    const groupPatterns = groupIndices.map(idx => patterns[idx]);
    const uniqueCells = new Set<string>();
    for (const p of groupPatterns) {
      for (const c of cellsOfPattern(p)) uniqueCells.add(c);
    }

    const patternCount = groupPatterns.length;
    const cellCount = uniqueCells.size;
    groups.push({
      color: patterns[i].color as 1 | 2,
      patternCount,
      cellCount,
      efficiency: patternCount / cellCount,
    });
  }

  return groups;
}
```

**Step 4: Run tests**

```bash
pnpm test src/utils/__tests__/trainingMetrics.test.ts
```
Expected: all PASS.

**Step 5: Run full suite**

```bash
pnpm test
```
Expected: all pass.

**Step 6: Commit**

```bash
git add src/utils/trainingMetrics.ts src/utils/__tests__/trainingMetrics.test.ts
git commit -m "feat(training): add trainingMetrics utility (chains, contributions, groups, distances)"
```

---

## Task 7: Board training overlays

**Files:**
- Create: `src/components/GameBoard/TrainingOverlay.tsx`
- Modify: `src/components/GameBoard/GameBoard.tsx`

**Step 1: Create `TrainingOverlay` component**

Create `src/components/GameBoard/TrainingOverlay.tsx`:

```tsx
import React from 'react';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type { Square } from '@/types/game';
import {
  computeCellContributions,
  computeColumnDistances,
} from '@/utils/trainingMetrics';
import { GAME_FIELD_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';

interface TrainingOverlayProps {
  detectedPatterns: Square[];
}

const COLUMN_DISTANCES = computeColumnDistances(BOARD_WIDTH);

/** Contribution badge: color intensity from 1 (faint) to 4 (bright) */
function contributionColor(count: number): string {
  const alpha = 0.15 + (count / 4) * 0.6; // 0.15 → 0.75
  return `rgba(255, 255, 100, ${alpha})`;
}

/** Column distance tint: 0 = neutral, 7 = orange-red */
function distanceColor(distance: number): string {
  const alpha = (distance / 7) * 0.25; // max 25% tint
  return `rgba(255, 100, 50, ${alpha})`;
}

export const TrainingOverlay: React.FC<TrainingOverlayProps> = ({
  detectedPatterns,
}) => {
  const contributions = computeCellContributions(detectedPatterns);

  return (
    <>
      {/* Column distance tint strips */}
      {Array.from({ length: BOARD_WIDTH }, (_, col) => (
        <div
          key={`col-dist-${col}`}
          className="pointer-events-none absolute"
          style={{
            left: `calc(${col} * var(--spacing-block-size))`,
            top: 0,
            width: 'var(--spacing-block-size)',
            height: `calc(${BOARD_HEIGHT} * var(--spacing-block-size))`,
            backgroundColor: distanceColor(COLUMN_DISTANCES[col]),
            ...getZIndexStyle(GAME_FIELD_Z_INDEX.GAME_EFFECTS - 1),
          }}
        />
      ))}

      {/* Per-cell contribution badges */}
      {Array.from(contributions.entries()).map(([key, count]) => {
        const [x, y] = key.split(',').map(Number);
        return (
          <div
            key={`contrib-${key}`}
            className="pointer-events-none absolute flex items-center justify-center text-xs font-bold"
            style={{
              left: `calc(${x} * var(--spacing-block-size))`,
              top: `calc(${y} * var(--spacing-block-size))`,
              width: 'var(--spacing-block-size)',
              height: 'var(--spacing-block-size)',
              backgroundColor: contributionColor(count),
              color: 'rgba(255, 255, 0, 0.9)',
              fontSize: '9px',
              ...getZIndexStyle(GAME_FIELD_Z_INDEX.GAME_EFFECTS + 1),
            }}
          >
            {count}
          </div>
        );
      })}
    </>
  );
};
```

**Step 2: Modify `GameBoard` to accept training mode prop**

In `src/components/GameBoard/GameBoard.tsx`:

1. Import `TrainingOverlay`:
```tsx
import { TrainingOverlay } from './TrainingOverlay';
```

2. Update `GameBoardProps`:
```tsx
export interface GameBoardProps {
  gameState: GameState;
  trainingMode?: boolean;
}
```

3. Destructure `trainingMode` in component:
```tsx
export const GameBoard: React.FC<GameBoardProps> = ({ gameState, trainingMode = false }) => {
```

4. Add overlay after `<FallingBlocks .../>` line, before `<TimelineComponent .../>`:
```tsx
      {trainingMode && (
        <TrainingOverlay detectedPatterns={gameState.detectedPatterns} />
      )}
```

5. Also hide the timeline bar in training mode (the auto-sweep timeline visual is misleading):
```tsx
      {!trainingMode && <TimelineComponent timeline={gameState.timeline} />}
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```
Expected: clean.

**Step 4: Commit**

```bash
git add src/components/GameBoard/TrainingOverlay.tsx src/components/GameBoard/GameBoard.tsx
git commit -m "feat(training): add board overlays for cell contributions and column distances"
```

---

## Task 8: TrainingHUD component

**Files:**
- Create: `src/components/TrainingHUD/index.tsx`

**Step 1: Create the component**

Create `src/components/TrainingHUD/index.tsx`:

```tsx
import React from 'react';
import type { GameState } from '@/types/game';
import {
  computeChainLengths,
  computeComboGroups,
  type ComboGroup,
} from '@/utils/trainingMetrics';

interface TrainingHUDProps {
  gameState: GameState;
}

function EfficiencyBar({ efficiency }: { efficiency: number }) {
  const color =
    efficiency >= 0.4
      ? 'text-green-400'
      : efficiency >= 0.25
        ? 'text-yellow-400'
        : 'text-red-400';
  const pct = Math.round(efficiency * 100);
  return (
    <span className={`font-mono text-xs ${color}`}>{pct}%</span>
  );
}

function ComboGroupRow({ group }: { group: ComboGroup }) {
  const colorLabel = group.color === 1 ? 'Light' : 'Dark';
  const colorClass = group.color === 1 ? 'text-gray-200' : 'text-gray-500';
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={`font-semibold ${colorClass}`}>{colorLabel}</span>
      <span className="text-gray-400">
        {group.patternCount}p / {group.cellCount}c
      </span>
      <EfficiencyBar efficiency={group.efficiency} />
    </div>
  );
}

export const TrainingHUD: React.FC<TrainingHUDProps> = ({ gameState }) => {
  const chains = computeChainLengths(gameState.detectedPatterns);
  const groups = computeComboGroups(gameState.detectedPatterns);
  const undoCount = gameState.undoStack.length;

  const dominantColor =
    chains.light > chains.dark ? 'light' : chains.dark > chains.light ? 'dark' : null;

  return (
    <div className="flex w-36 flex-col gap-3 rounded-lg border border-gray-700/50 bg-gray-900/90 p-3 text-white">
      {/* Chain lengths */}
      <div>
        <p className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
          Chains
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs ${dominantColor === 'light' ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
              Light
            </span>
            <span className="font-mono text-sm">{chains.light}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${dominantColor === 'dark' ? 'text-yellow-300 font-bold' : 'text-gray-400'}`}>
              Dark
            </span>
            <span className="font-mono text-sm">{chains.dark}</span>
          </div>
        </div>
      </div>

      {/* Combo groups */}
      {groups.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            Combos
          </p>
          <div className="space-y-1">
            {groups.map((g, i) => (
              <ComboGroupRow key={i} group={g} />
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-600">
            p=patterns c=cells
          </p>
        </div>
      )}

      {/* Undo indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">↩ Undo</span>
        <span className={`font-mono text-xs ${undoCount > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
          {undoCount}
        </span>
      </div>

      {/* Key hints */}
      <div className="border-t border-gray-700/50 pt-2 text-xs text-gray-600 space-y-0.5">
        <div>[S] Sweep</div>
        <div>[Ctrl+Z] Undo</div>
      </div>
    </div>
  );
};
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```
Expected: clean.

**Step 3: Commit**

```bash
git add src/components/TrainingHUD/index.tsx
git commit -m "feat(training): add TrainingHUD component with chain meter and combo efficiency"
```

---

## Task 9: TrainingScreen

**Files:**
- Create: `src/screens/TrainingScreen.tsx`
- Modify: `src/screens/index.ts`

**Step 1: Understand what useGame needs for training**

`useGame` creates initial state from `createInitialGameState`. We need to pass `mode: 'training'`. We'll create a `useTrainingGame` function inside `TrainingScreen` by using `useReducer` directly with a training-mode initial state, following the `useGame` pattern.

Actually simpler: we'll use `useGame` directly (it handles reducer), then we need to:
1. Start in training mode → use `createInitialGameState(..., 'training')` for initial state
2. Skip countdown → dispatch `SKIP_COUNTDOWN` after `START_GAME`
3. Need `MANUAL_SWEEP` and `UNDO` dispatches

We'll patch `useGame` to accept an optional `mode` param, or just use `_dispatch` from `useGame`.

**Step 2: Update `useGame` to accept mode**

In `src/hooks/useGame.ts`:

1. Change the function signature:
```ts
export function useGame(
  initialSeed?: string,
  defaultDebugMode = false,
  mode: 'normal' | 'training' = 'normal'
): UseGameReturn {
```

2. Pass mode to `createInitialGameState`:
```ts
  const [gameState, dispatch] = useReducer(
    gameReducerWithDebug,
    createInitialGameState(initialSeed, defaultDebugMode, mode)
  );
```

**Step 3: Create `src/screens/TrainingScreen.tsx`**

```tsx
import React, { useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { TrainingHUD } from '@/components/TrainingHUD';
import { GameBoard } from '@/components/GameBoard/GameBoard';
import { useGame } from '@/hooks/useGame';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGameControls } from '@/hooks/useGameControls';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';

export function TrainingScreen() {
  const navigate = useNavigate();
  const { gameState, actions, _dispatch } = useGame(undefined, false, 'training');
  const scale = useResponsiveScale({ minScale: 0.5, maxScale: 2, padding: 40 });

  // Game loop: runs TICK for RAF rendering (training mode TICK only updates fallingColumns)
  const gameLoop = useGameLoop(actions.tick, {
    enabled: gameState.status === 'playing',
  });

  // Standard controls (move, rotate, hard drop)
  const controls = useGameControls(gameState, actions, {
    enableKeyRepeat: false,
  });

  // Training-specific controls: S = sweep, Ctrl+Z = undo
  const handleTrainingKey = useCallback(
    (e: KeyboardEvent) => {
      if (gameState.status !== 'playing') return;
      // S key → MANUAL_SWEEP
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        _dispatch({ type: 'MANUAL_SWEEP' });
      }
      // Ctrl+Z → UNDO
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        _dispatch({ type: 'UNDO' });
      }
    },
    [gameState.status, _dispatch]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleTrainingKey);
    return () => window.removeEventListener('keydown', handleTrainingKey);
  }, [handleTrainingKey]);

  // Auto-start and skip countdown
  useEffect(() => {
    if (gameState.status === 'initial') {
      actions.startNewGame();
    }
    if (gameState.status === 'countdown') {
      actions.skipCountdown();
    }
  }, [gameState.status, actions]);

  if (!scale.ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-game-background relative flex h-screen w-full flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Menu</span>
        </button>
        <span className="text-sm font-semibold text-gray-300">Training</span>
        <span className="text-sm text-gray-500">Score: {gameState.score}</span>
      </div>

      {/* Game + HUD */}
      <div className="flex items-center gap-4">
        <div
          style={{
            transform: `scale(${scale.scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Custom game layout with training overlays on the board */}
          <div className="bg-game-background gap-block-size relative flex flex-row">
            {/* Queue preview — reuse Queue component via GameCore layout */}
            <GameCore
              key={gameState.seed}
              gameState={gameState}
              actions={actions}
              controls={controls}
              gameLoop={gameLoop}
              scale={scale}
              replayMode={true}
              exportReplay={() => null}
            />
          </div>
        </div>
        <TrainingHUD gameState={gameState} />
      </div>
    </div>
  );
}
```

Wait — the above nests GameCore inside another scaled div. Let me reconsider: GameCore handles the scale internally by wrapping `GameLayout` with `style={{ transform: scale(${scale.scale}) }}`. So I should render GameCore normally, and the TrainingHUD alongside it *outside* the scaled container.

Replace with a cleaner structure:

```tsx
  return (
    <div className="bg-game-background relative flex h-screen w-full flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Menu</span>
        </button>
        <span className="text-sm font-semibold text-gray-300">Training</span>
        <span className="text-sm text-gray-500">Score: {gameState.score}</span>
      </div>

      {/* Game area + HUD side by side */}
      <div className="flex items-center gap-6">
        {/* GameCore handles its own scaling internally */}
        <GameCore
          key={gameState.seed}
          gameState={gameState}
          actions={actions}
          controls={controls}
          gameLoop={gameLoop}
          scale={scale}
          replayMode={true}
          exportReplay={() => null}
          trainingMode={true}
        />
        <TrainingHUD gameState={gameState} />
      </div>
    </div>
  );
```

This requires adding `trainingMode?: boolean` to `GameCoreProps` and threading it down to `GameLayout` → `GameBoard`. Let's do that.

**Step 4: Thread `trainingMode` prop through GameCore → GameLayout → GameBoard**

In `src/components/Game/GameCore.tsx`:
- Add `trainingMode?: boolean` to `GameCoreProps`
- Pass to `GameLayout`: `<GameLayout gameState={gameState} trainingMode={trainingMode} />`

In `src/components/Game/GameLayout.tsx`:
- Add `trainingMode?: boolean` to `GameLayoutProps`
- Pass to `GameBoard`: `<GameBoard gameState={gameState} trainingMode={trainingMode} />`

**Step 5: Run typecheck**

```bash
pnpm typecheck
```
Expected: clean.

**Step 6: Add to screens barrel**

In `src/screens/index.ts`, add:
```ts
export { TrainingScreen } from './TrainingScreen';
```

**Step 7: Commit**

```bash
git add src/screens/TrainingScreen.tsx src/screens/index.ts src/hooks/useGame.ts src/components/Game/GameCore.tsx src/components/Game/GameLayout.tsx
git commit -m "feat(training): add TrainingScreen with custom controls and HUD layout"
```

---

## Task 10: Wire up routing and Start Screen button

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/StartScreen.tsx`

**Step 1: Add route in App.tsx**

In `src/App.tsx`, import `TrainingScreen`:
```tsx
import {
  StartScreen,
  GameScreen,
  LeaderboardScreen,
  ReplayScreen,
  AiWatchScreen,
  TrainingScreen,
} from '@/screens';
```

Add route after `/ai-watch`:
```tsx
<Route path="/training" element={<TrainingScreen />} />
```

**Step 2: Add Training button to StartScreen**

In `src/screens/StartScreen.tsx`, import the `Dumbbell` icon from lucide-react (or `GraduationCap`):
```tsx
import { Play, ChartNoAxesColumn, Bot, GraduationCap } from 'lucide-react';
```

Add button after the "Watch AI" button:
```tsx
          <Button
            size="lg"
            onClick={() => navigate('/training')}
            variant="secondary"
            icon={GraduationCap}
            fullWidth
          >
            Training
          </Button>
```

**Step 3: Run typecheck and build**

```bash
pnpm typecheck && pnpm build
```
Expected: clean build.

**Step 4: Commit**

```bash
git add src/App.tsx src/screens/StartScreen.tsx
git commit -m "feat(training): add /training route and Training button to Start screen"
```

---

## Task 11: End-to-end verification

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Navigate to training mode**
- Open browser at `http://localhost:5173`
- Click "Training" button → should navigate to `/training`
- Game board should appear, block should be visible and NOT falling
- TrainingHUD sidebar should appear on the right

**Step 3: Verify block behaviour**
- Press `←` `→` → block moves
- Press `Z` `X` → block rotates
- Wait 5 seconds → block should NOT fall (no auto-drop)

**Step 4: Verify hard drop and undo**
- Press `Space` → block drops to bottom, new block appears
- HUD should show `↩ Undo: 1`
- Press `Ctrl+Z` → previous board state restored, undo counter decreases

**Step 5: Verify manual sweep**
- Hard drop several blocks to form a 2×2 same-color pattern
- White outline should appear around the pattern (DetectedPatterns overlay)
- Chain length in HUD should show > 0
- Cell contribution badges should appear on pattern cells
- Press `S` → pattern clears, score increases, HUD updates

**Step 6: Verify board overlays**
- Column distance tint: columns 7–8 should be neutral, edges (0, 15) should have orange-red tint
- Cell contribution badges: cells shared by 2 patterns should show `2`

**Step 7: Run tests**

```bash
pnpm test
```
Expected: all tests pass.

---

## Summary of files changed

| File | Change |
|------|--------|
| `src/types/game.ts` | Add `mode`, `undoStack`, `MANUAL_SWEEP`, `UNDO` |
| `src/reducers/gameState/initialState.ts` | Add `mode` param, init new fields |
| `src/reducers/actions/gameTick.ts` | Skip drop/timeline in training mode |
| `src/reducers/actions/placement.ts` | Save undo snapshot on HARD_DROP |
| `src/reducers/actions/training.ts` | New: `handleManualSweep`, `handleUndo` |
| `src/reducers/actions/index.ts` | Export training handlers |
| `src/reducers/gameReducer.ts` | Add cases for new actions |
| `src/hooks/useGame.ts` | Accept `mode` parameter |
| `src/utils/trainingMetrics.ts` | New: chain, contribution, group, distance utilities |
| `src/components/GameBoard/TrainingOverlay.tsx` | New: column distance + cell contribution overlays |
| `src/components/GameBoard/GameBoard.tsx` | Accept `trainingMode` prop, render overlay, hide timeline |
| `src/components/Game/GameCore.tsx` | Thread `trainingMode` prop |
| `src/components/Game/GameLayout.tsx` | Thread `trainingMode` prop |
| `src/components/TrainingHUD/index.tsx` | New: chain meter + combo efficiency + undo count |
| `src/screens/TrainingScreen.tsx` | New: full training screen |
| `src/screens/index.ts` | Export `TrainingScreen` |
| `src/App.tsx` | Add `/training` route |
| `src/screens/StartScreen.tsx` | Add Training button |
