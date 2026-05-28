# Practice / Slow Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add adjustable speed (`0.25x`/`0.5x`/`1x`/`2x`) and an optional auto-sweep toggle to the existing `/training` screen, and fix the restart bug that drops `state.mode`.

**Architecture:** Practice settings live inside `GameState.practice` so the reducer's `TICK` reads them every frame. Two new actions (`SET_PRACTICE_SPEED`, `SET_PRACTICE_AUTO_SWEEP`) mutate them and recompute the effective `dropInterval`, `timeline.sweepInterval`, and (when entering/leaving auto-sweep) the `gameTimer`. Drop and timer paths in `gameTick` learn to run in training mode based on practice settings; the existing manual `S` sweep + `A` undo continue to work.

**Tech Stack:** TypeScript, React 18, Vitest + `@testing-library/react`, existing reducer pattern.

**Caveat on multipliers:** `Math.round(15 / 2) = 8` — at `2x`, sweep advances every 8 frames instead of an exact `7.5`. Practice mode doesn't record replays, so the minor non-integer rounding is acceptable. `dropInterval` (90) and `GAME_DURATION_FRAMES` (3600) divide cleanly into all four multipliers.

**Spec:** `docs/superpowers/specs/2026-05-28-practice-slow-mode-design.md`

---

## File Structure

**Modify:**
- `src/types/game.ts` — add `practice` field to `GameState`; add `SET_PRACTICE_SPEED` and `SET_PRACTICE_AUTO_SWEEP` to `GameActionType`.
- `src/reducers/gameState/initialState.ts` — initialize `practice` for training mode.
- `src/reducers/actions/training.ts` — add `handleSetPracticeSpeed`, `handleSetPracticeAutoSweep`.
- `src/reducers/actions/index.ts` — export the two new handlers.
- `src/reducers/gameReducer.ts` — wire the two new actions into the switch.
- `src/reducers/actions/gameTick.ts` — let training mode run drop / sweep / timer based on practice settings.
- `src/reducers/actions/gameFlow.ts` — fix `handleRestart` to forward `state.mode`.
- `src/components/TrainingHUD/index.tsx` — add speed presets + auto-sweep toggle controls.
- `src/screens/TrainingScreen.tsx` — pass dispatch wrappers (or `_dispatch`) into `TrainingHUD` so it can dispatch the new actions.

**Tests:**
- `src/reducers/__tests__/gameReducer.training.test.ts` — extend with practice-mode tests.
- `src/reducers/__tests__/gameReducer.basic.test.ts` — add restart-mode-preservation test.

---

## Task 1: Add `practice` field to state and new action types

**Files:**
- Modify: `src/types/game.ts:62-79` (action types), `src/types/game.ts:88-133` (GameState)
- Modify: `src/reducers/gameState/initialState.ts:16-83`

- [ ] **Step 1: Write the failing test**

Append to `src/reducers/__tests__/gameReducer.training.test.ts`:

```ts
describe('training mode practice settings', () => {
  it('initializes practice with defaults in training mode', () => {
    const s = createInitialGameState('seed', false, 'training');
    expect(s.practice).toEqual({ speedMultiplier: 1, autoSweep: false });
  });

  it('does not initialize practice in normal mode', () => {
    const s = createInitialGameState('seed', false, 'normal');
    expect(s.practice).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts -t "practice settings"`
Expected: FAIL — property `practice` doesn't exist.

- [ ] **Step 3: Add the type and action additions**

In `src/types/game.ts`, add to `GameActionType` (alongside `'MANUAL_SWEEP'`, `'UNDO'`):

```ts
  | 'SET_PRACTICE_SPEED' // Training: set speed multiplier (0.25 | 0.5 | 1 | 2)
  | 'SET_PRACTICE_AUTO_SWEEP'; // Training: enable/disable auto timeline sweep
```

Add the `PracticeSettings` type and field on `GameState` right above the `// Training mode` block:

```ts
// Practice / slow mode (training only)
export type PracticeSpeedMultiplier = 0.25 | 0.5 | 1 | 2;

export interface PracticeSettings {
  speedMultiplier: PracticeSpeedMultiplier;
  autoSweep: boolean;
}
```

And inside `GameState`, after `undoStack: GameState[];`:

```ts
  practice?: PracticeSettings;
```

- [ ] **Step 4: Initialize `practice` in `createInitialGameState`**

In `src/reducers/gameState/initialState.ts`, return object additions (right after `undoStack: [],`):

```ts
    // Practice settings (training mode only)
    practice: mode === 'training'
      ? { speedMultiplier: 1, autoSweep: false }
      : undefined,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts -t "practice settings"`
Expected: PASS (both tests).

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/reducers/gameState/initialState.ts src/reducers/__tests__/gameReducer.training.test.ts
git commit -m "feat(training): add practice settings to GameState"
```

---

## Task 2: `SET_PRACTICE_SPEED` handler

The handler updates `practice.speedMultiplier` and recomputes `dropInterval` and `timeline.sweepInterval`. When `autoSweep` is currently on, it also scales the remaining `gameTimer` proportionally (`newRemaining = oldRemaining * oldMultiplier / newMultiplier`).

**Files:**
- Modify: `src/reducers/actions/training.ts` (append handler)
- Modify: `src/reducers/actions/index.ts` (export)
- Modify: `src/reducers/gameReducer.ts` (wire into switch)

- [ ] **Step 1: Write failing tests**

Append to `src/reducers/__tests__/gameReducer.training.test.ts`:

```ts
describe('SET_PRACTICE_SPEED', () => {
  it('updates speedMultiplier and scales dropInterval and sweepInterval', () => {
    const s = makeTrainingState();
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    expect(r.practice?.speedMultiplier).toBe(0.5);
    expect(r.dropInterval).toBe(180); // 90 / 0.5
    expect(r.timeline.sweepInterval).toBe(30); // 15 / 0.5
  });

  it('rounds non-integer sweep intervals (2x => 8)', () => {
    const s = makeTrainingState();
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 2,
    });
    expect(r.dropInterval).toBe(45);
    expect(r.timeline.sweepInterval).toBe(8); // round(15 / 2)
  });

  it('scales remaining gameTimer when autoSweep is on', () => {
    // Start from training state with autoSweep on, gameTimer = 3600
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
      gameTimer: 3600,
    };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    // Going from 1x to 0.5x doubles the remaining timer
    expect(r.gameTimer).toBe(7200);
  });

  it('does not scale gameTimer when autoSweep is off', () => {
    const s = makeTrainingState();
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    expect(r.gameTimer).toBe(s.gameTimer);
  });

  it('is a no-op in normal mode', () => {
    const s = { ...createInitialGameState('seed', false, 'normal'), status: 'playing' as const };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    expect(r).toBe(s);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts -t "SET_PRACTICE_SPEED"`
Expected: FAIL — handler not wired, action falls through to default and returns state unchanged (most assertions fail).

- [ ] **Step 3: Implement the handler**

Append to `src/reducers/actions/training.ts`:

```ts
import { TIMER_CONFIG, GAME_CONFIG } from '@/constants/gameConfig';
import type { GameAction, PracticeSpeedMultiplier } from '@/types/game';

const BASE_DROP_INTERVAL = TIMER_CONFIG.FIXED_DROP_INTERVAL;
const BASE_SWEEP_INTERVAL = GAME_CONFIG.timeline.sweepInterval;

/**
 * Handle SET_PRACTICE_SPEED: update multiplier and rescale drop/sweep intervals.
 * When autoSweep is on, also rescales the remaining gameTimer proportionally.
 * No-op outside training mode.
 */
export function handleSetPracticeSpeed(
  state: GameState,
  action: GameAction
): GameState {
  if (state.mode !== 'training' || !state.practice) {
    return state;
  }
  const newMultiplier = action.payload as PracticeSpeedMultiplier;
  const oldMultiplier = state.practice.speedMultiplier;

  const dropInterval = Math.max(
    1,
    Math.round(BASE_DROP_INTERVAL / newMultiplier)
  );
  const sweepInterval = Math.max(
    1,
    Math.round(BASE_SWEEP_INTERVAL / newMultiplier)
  );

  const gameTimer = state.practice.autoSweep
    ? Math.max(0, Math.round((state.gameTimer * oldMultiplier) / newMultiplier))
    : state.gameTimer;

  return {
    ...state,
    practice: { ...state.practice, speedMultiplier: newMultiplier },
    dropInterval,
    timeline: { ...state.timeline, sweepInterval },
    gameTimer,
  };
}
```

(Note: the import of `GameState` is already present at the top of the file — keep one import line, don't duplicate.)

- [ ] **Step 4: Export the handler**

In `src/reducers/actions/index.ts`, change the training export line to:

```ts
// Training actions
export {
  handleManualSweep,
  handleUndo,
  handleSetPracticeSpeed,
} from './training';
```

- [ ] **Step 5: Wire into the reducer**

In `src/reducers/gameReducer.ts`, update the imports from `./actions` to include `handleSetPracticeSpeed`, and add a case to the switch (right after the `'UNDO'` case):

```ts
    case 'SET_PRACTICE_SPEED':
      return handleSetPracticeSpeed(state, action);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts -t "SET_PRACTICE_SPEED"`
Expected: PASS (all five tests).

- [ ] **Step 7: Commit**

```bash
git add src/reducers/actions/training.ts src/reducers/actions/index.ts src/reducers/gameReducer.ts src/reducers/__tests__/gameReducer.training.test.ts
git commit -m "feat(training): add SET_PRACTICE_SPEED action"
```

---

## Task 3: `SET_PRACTICE_AUTO_SWEEP` handler

The handler flips `practice.autoSweep`. On enable, it resets `gameTimer` to the full scaled duration. On disable, it leaves `timeline.x` and `gameTimer` in place (sweep simply stops advancing because `gameTick` checks `autoSweep`).

**Files:**
- Modify: `src/reducers/actions/training.ts`
- Modify: `src/reducers/actions/index.ts`
- Modify: `src/reducers/gameReducer.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/reducers/__tests__/gameReducer.training.test.ts`:

```ts
describe('SET_PRACTICE_AUTO_SWEEP', () => {
  it('enables autoSweep and resets gameTimer to scaled full duration', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 0.5, autoSweep: false },
      gameTimer: 0,
    };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: true,
    });
    expect(r.practice?.autoSweep).toBe(true);
    expect(r.gameTimer).toBe(7200); // 3600 / 0.5
  });

  it('disables autoSweep without touching gameTimer or timeline.x', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
      gameTimer: 1234,
      timeline: { ...base.timeline, x: 5 },
    };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: false,
    });
    expect(r.practice?.autoSweep).toBe(false);
    expect(r.gameTimer).toBe(1234);
    expect(r.timeline.x).toBe(5);
  });

  it('is a no-op in normal mode', () => {
    const s = { ...createInitialGameState('seed', false, 'normal'), status: 'playing' as const };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: true,
    });
    expect(r).toBe(s);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts -t "SET_PRACTICE_AUTO_SWEEP"`
Expected: FAIL — handler not wired.

- [ ] **Step 3: Implement the handler**

Append to `src/reducers/actions/training.ts` (after `handleSetPracticeSpeed`):

```ts
/**
 * Handle SET_PRACTICE_AUTO_SWEEP: toggle auto timeline sweep.
 * On enable, reset gameTimer to the full scaled duration. On disable, leave
 * timeline position and gameTimer where they are. No-op outside training mode.
 */
export function handleSetPracticeAutoSweep(
  state: GameState,
  action: GameAction
): GameState {
  if (state.mode !== 'training' || !state.practice) {
    return state;
  }
  const autoSweep = action.payload as boolean;

  if (autoSweep) {
    const gameTimer = Math.round(
      TIMER_CONFIG.GAME_DURATION_FRAMES / state.practice.speedMultiplier
    );
    return {
      ...state,
      practice: { ...state.practice, autoSweep: true },
      gameTimer,
    };
  }

  return {
    ...state,
    practice: { ...state.practice, autoSweep: false },
  };
}
```

- [ ] **Step 4: Export and wire it up**

In `src/reducers/actions/index.ts`, extend the training exports:

```ts
// Training actions
export {
  handleManualSweep,
  handleUndo,
  handleSetPracticeSpeed,
  handleSetPracticeAutoSweep,
} from './training';
```

In `src/reducers/gameReducer.ts`, add the import and switch case (right after the `'SET_PRACTICE_SPEED'` case):

```ts
    case 'SET_PRACTICE_AUTO_SWEEP':
      return handleSetPracticeAutoSweep(state, action);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts -t "SET_PRACTICE_AUTO_SWEEP"`
Expected: PASS (all three tests).

- [ ] **Step 6: Commit**

```bash
git add src/reducers/actions/training.ts src/reducers/actions/index.ts src/reducers/gameReducer.ts src/reducers/__tests__/gameReducer.training.test.ts
git commit -m "feat(training): add SET_PRACTICE_AUTO_SWEEP action"
```

---

## Task 4: Update `gameTick` so training mode honors practice settings

Today, training mode skips `handleBlockDrop`, `updateTimeline`, and `handleGameTimer` entirely. We need:

- Block drop runs in training mode (uses scaled `dropInterval`).
- Timeline sweep runs when `practice.autoSweep === true` (uses scaled `sweepInterval`).
- Game timer counts down when `practice.autoSweep === true`.

**Files:**
- Modify: `src/reducers/actions/gameTick.ts:65-80, 144-188`

- [ ] **Step 1: Write failing tests**

Append to `src/reducers/__tests__/gameReducer.training.test.ts`:

```ts
describe('training mode tick honors practice settings', () => {
  it('auto-drops the block in training mode (scaled drop interval)', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: false },
    };
    const initialY = s.blockPosition.y;

    let t: GameState = s;
    for (let i = 0; i < s.dropInterval + 1; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.blockPosition.y).toBeGreaterThan(initialY);
  });

  it('does not advance the timeline when autoSweep is off', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: false },
    };
    let t: GameState = s;
    for (let i = 0; i < s.timeline.sweepInterval + 5; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.timeline.x).toBe(s.timeline.x);
  });

  it('advances the timeline when autoSweep is on', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
    };
    let t: GameState = s;
    for (let i = 0; i < s.timeline.sweepInterval + 1; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.timeline.x).toBe(s.timeline.x + 1);
  });

  it('counts down gameTimer when autoSweep is on', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
      gameTimer: 100,
    };
    let t: GameState = s;
    for (let i = 0; i < 10; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.gameTimer).toBe(90);
  });

  it('does not count down gameTimer when autoSweep is off', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: false },
      gameTimer: 100,
    };
    let t: GameState = s;
    for (let i = 0; i < 10; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.gameTimer).toBe(100);
  });
});
```

Note: this conflicts with the older training test `'does not auto-drop the block when mode is training'` and `'does not advance the timeline when mode is training'` — those represented the old behavior. **Delete those two tests** (lines around 13-36 in `gameReducer.training.test.ts`): they assumed training never auto-drops and never sweeps, which is no longer true. The new tests above cover both the off and on cases.

Keep `'does not count down game timer when mode is training'` — but update it: with the new semantics, gameTimer doesn't tick down only when `autoSweep` is off. Modify the existing test to construct `practice: { autoSweep: false }` explicitly:

```ts
  it('does not count down game timer when mode is training and autoSweep is off', () => {
    const state = makeTrainingState();
    const initialTimer = state.gameTimer;

    let s: GameState = state;
    for (let i = 0; i < 10; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.gameTimer).toBe(initialTimer);
  });
```

(`makeTrainingState()` already gives `practice.autoSweep === false` because the default initialization sets it that way.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts -t "honors practice settings"`
Expected: FAIL — block doesn't drop in training, timeline doesn't advance, etc.

- [ ] **Step 3: Update `handleCountdownAndTimer` in `gameTick.ts`**

Replace lines 65-80 (`handleCountdownAndTimer`) with:

```ts
export function handleCountdownAndTimer(state: GameState): GameState {
  // Training mode: only run the game timer when auto-sweep is on; skip countdown.
  if (state.mode === 'training') {
    if (state.status === 'playing' && state.practice?.autoSweep) {
      return handleGameTimer(state);
    }
    return { ...state, frame: state.frame + 1 };
  }

  if (state.status === 'countdown') {
    return handleCountdown(state);
  }

  if (state.status === 'playing') {
    return handleGameTimer(state);
  }

  return state;
}
```

- [ ] **Step 4: Update `handleGameTick` in `gameTick.ts`**

Replace the training-mode block (lines 156-164) and the rest of the function with:

```ts
  // Training mode: run drop, optional sweep, pattern detection, falling cols.
  if (newState.mode === 'training') {
    // Block dropping (uses scaled dropInterval)
    newState = handleBlockDrop(newState, newState.frame, rng);

    // Pattern detection
    newState = updatePatternDetection(newState);

    // Optional auto-sweep
    if (newState.practice?.autoSweep) {
      newState = updateTimeline(newState);
    }

    // Falling columns
    const { newBoard, newFallingColumns } = updateFallingColumns(
      newState.board,
      newState.fallingColumns
    );
    return { ...newState, board: newBoard, fallingColumns: newFallingColumns };
  }

  // Normal mode (unchanged)
  newState = handleBlockDrop(newState, newState.frame, rng);
  newState = updatePatternDetection(newState);
  newState = updateTimeline(newState);

  const { newBoard, newFallingColumns } = updateFallingColumns(
    newState.board,
    newState.fallingColumns
  );

  return { ...newState, board: newBoard, fallingColumns: newFallingColumns };
```

- [ ] **Step 5: Run the targeted tests**

Run: `pnpm test src/reducers/__tests__/gameReducer.training.test.ts`
Expected: PASS for all training tests, including the new "honors practice settings" group.

- [ ] **Step 6: Run the full reducer test suite to catch regressions**

Run: `pnpm test src/reducers/__tests__/`
Expected: PASS. If any pre-existing fixture tests around training mode fail, they likely assumed the old "no drop, no sweep" behavior — inspect each one. If the test's intent was clearly "training mode shouldn't auto-do X without explicit settings", update its fixture to set `practice.autoSweep` to match the intent.

- [ ] **Step 7: Commit**

```bash
git add src/reducers/actions/gameTick.ts src/reducers/__tests__/gameReducer.training.test.ts
git commit -m "feat(training): honor practice settings in TICK"
```

---

## Task 5: Fix the `handleRestart` mode-dropping bug

**Files:**
- Modify: `src/reducers/actions/gameFlow.ts:41-44`
- Test: `src/reducers/__tests__/gameReducer.basic.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/reducers/__tests__/gameReducer.basic.test.ts`:

```ts
describe('RESTART preserves mode', () => {
  it('preserves training mode on restart', () => {
    const s = createInitialGameState('seed-1', false, 'training');
    const r = gameReducer(s, { type: 'RESTART', payload: 'seed-2' });
    expect(r.mode).toBe('training');
    expect(r.practice).toEqual({ speedMultiplier: 1, autoSweep: false });
  });

  it('preserves normal mode on restart', () => {
    const s = createInitialGameState('seed-1', false, 'normal');
    const r = gameReducer(s, { type: 'RESTART', payload: 'seed-2' });
    expect(r.mode).toBe('normal');
    expect(r.practice).toBeUndefined();
  });
});
```

(Imports `createInitialGameState` and `gameReducer` may already be at the top of the file — reuse them if so.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/reducers/__tests__/gameReducer.basic.test.ts -t "RESTART preserves mode"`
Expected: FAIL — restart returns state with `mode === 'normal'` regardless of input mode.

- [ ] **Step 3: Fix the handler**

In `src/reducers/actions/gameFlow.ts`, replace `handleRestart`:

```ts
export function handleRestart(state: GameState, action: GameAction): GameState {
  const seed = action.payload as string;
  return createInitialGameState(seed, state.debugMode, state.mode);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/reducers/__tests__/gameReducer.basic.test.ts -t "RESTART preserves mode"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/reducers/actions/gameFlow.ts src/reducers/__tests__/gameReducer.basic.test.ts
git commit -m "fix(training): preserve mode on RESTART"
```

---

## Task 6: TrainingHUD UI — speed presets + auto-sweep toggle

**Files:**
- Modify: `src/components/TrainingHUD/index.tsx`
- Modify: `src/screens/TrainingScreen.tsx` (pass dispatch)

- [ ] **Step 1: Write a failing component test**

Create `src/components/TrainingHUD/__tests__/TrainingHUD.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TrainingHUD } from '@/components/TrainingHUD';
import { createInitialGameState } from '@/reducers/gameState/initialState';

function baseState() {
  return createInitialGameState('hud-seed', false, 'training');
}

describe('TrainingHUD practice controls', () => {
  it('dispatches SET_PRACTICE_SPEED when a preset is clicked', () => {
    const dispatch = vi.fn();
    render(<TrainingHUD gameState={baseState()} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole('button', { name: '0.5x' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
  });

  it('dispatches SET_PRACTICE_AUTO_SWEEP when the toggle is clicked', () => {
    const dispatch = vi.fn();
    render(<TrainingHUD gameState={baseState()} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole('switch', { name: /auto sweep/i }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: true,
    });
  });

  it('highlights the currently selected speed preset', () => {
    const state = baseState();
    state.practice = { speedMultiplier: 2, autoSweep: false };
    render(<TrainingHUD gameState={state} dispatch={() => {}} />);

    const selected = screen.getByRole('button', { name: '2x' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/components/TrainingHUD/__tests__/TrainingHUD.test.tsx`
Expected: FAIL — `dispatch` prop doesn't exist, buttons don't exist.

- [ ] **Step 3: Update `TrainingHUD` props and add UI**

Replace `src/components/TrainingHUD/index.tsx` with:

```tsx
import React from 'react';

import { Switch } from '@/components/ui/switch';
import type {
  GameAction,
  GameState,
  PracticeSpeedMultiplier,
} from '@/types/game';
import {
  computeChainLengths,
  computeComboGroups,
  type ComboGroup,
} from '@/utils/trainingMetrics';

interface TrainingHUDProps {
  gameState: GameState;
  dispatch?: React.Dispatch<GameAction>;
}

const SPEED_PRESETS: PracticeSpeedMultiplier[] = [0.25, 0.5, 1, 2];

function EfficiencyBar({ efficiency }: { efficiency: number }) {
  const color =
    efficiency >= 0.4
      ? 'text-success'
      : efficiency >= 0.25
        ? 'text-warning'
        : 'text-destructive';
  const pct = Math.round(efficiency * 100);
  return (
    <span className={`font-mono text-xs tabular-nums ${color}`}>{pct}%</span>
  );
}

function ComboGroupRow({ group }: { group: ComboGroup }) {
  const colorLabel = group.color === 1 ? 'Light' : 'Dark';
  const colorClass =
    group.color === 1 ? 'text-foreground' : 'text-muted-foreground';
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={`font-semibold ${colorClass}`}>{colorLabel}</span>
      <span className="text-muted-foreground tabular-nums">
        {group.patternCount}p / {group.cellCount}c
      </span>
      <EfficiencyBar efficiency={group.efficiency} />
    </div>
  );
}

function PracticeControls({
  practice,
  dispatch,
}: {
  practice: NonNullable<GameState['practice']>;
  dispatch: React.Dispatch<GameAction>;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
        Practice
      </p>
      <div className="mb-2 flex gap-1">
        {SPEED_PRESETS.map(mult => {
          const selected = practice.speedMultiplier === mult;
          return (
            <button
              key={mult}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                dispatch({ type: 'SET_PRACTICE_SPEED', payload: mult })
              }
              className={`flex-1 rounded border px-1 py-0.5 font-mono text-xs ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              {mult}x
            </button>
          );
        })}
      </div>
      <label className="flex items-center justify-between text-xs">
        <span className="text-foreground">Auto sweep</span>
        <Switch
          checked={practice.autoSweep}
          aria-label="Auto sweep"
          onCheckedChange={checked =>
            dispatch({ type: 'SET_PRACTICE_AUTO_SWEEP', payload: checked })
          }
        />
      </label>
    </div>
  );
}

export const TrainingHUD: React.FC<TrainingHUDProps> = ({
  gameState,
  dispatch,
}) => {
  const chains = computeChainLengths(gameState.detectedPatterns);
  const groups = computeComboGroups(gameState.detectedPatterns);
  const undoCount = gameState.undoStack.length;

  const dominantColor =
    chains.light > chains.dark
      ? 'light'
      : chains.dark > chains.light
        ? 'dark'
        : null;

  return (
    <div className="border-border bg-card/90 text-foreground flex w-36 flex-col gap-3 rounded-lg border p-3">
      {/* Practice controls */}
      {gameState.practice && dispatch && (
        <PracticeControls practice={gameState.practice} dispatch={dispatch} />
      )}

      {/* Chain lengths */}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Chains
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${dominantColor === 'light' ? 'text-warning font-bold' : 'text-foreground'}`}
            >
              Light
            </span>
            <span className="font-mono text-sm tabular-nums">
              {chains.light}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${dominantColor === 'dark' ? 'text-warning font-bold' : 'text-muted-foreground'}`}
            >
              Dark
            </span>
            <span className="font-mono text-sm tabular-nums">
              {chains.dark}
            </span>
          </div>
        </div>
      </div>

      {/* Combo groups */}
      {groups.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
            Combos
          </p>
          <div className="space-y-1">
            {groups.map((g, i) => (
              <ComboGroupRow key={i} group={g} />
            ))}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            p=patterns c=cells
          </p>
        </div>
      )}

      {/* Undo indicator */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">↩ Undo</span>
        <span
          className={`font-mono text-xs tabular-nums ${undoCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {undoCount}
        </span>
      </div>

      {/* Key hints */}
      <div className="border-border text-muted-foreground space-y-0.5 border-t pt-2 text-xs">
        <div>[A] Undo</div>
        <div>[S] Sweep</div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Pass dispatch from `TrainingScreen`**

In `src/screens/TrainingScreen.tsx`, change the `<TrainingHUD>` usage from:

```tsx
<TrainingHUD gameState={gameState} />
```

to:

```tsx
<TrainingHUD gameState={gameState} dispatch={_dispatch} />
```

- [ ] **Step 5: Run the component tests**

Run: `pnpm test src/components/TrainingHUD/__tests__/TrainingHUD.test.tsx`
Expected: PASS (all three tests).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/TrainingHUD/ src/screens/TrainingScreen.tsx
git commit -m "feat(training): add speed and auto-sweep controls to HUD"
```

---

## Task 7: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify each scenario in the browser**

Open `/training`. Confirm:

1. **Default state.** Speed shows `1x` selected. Auto-sweep is off. Block does not auto-drop; timeline does not advance. Manual `S` and `A` still work.
2. **Slow drop.** Click `0.25x`. Block drops *much* slower (every 360 frames ≈ 6s). Timeline still doesn't advance.
3. **Fast drop.** Click `2x`. Block drops noticeably faster (every 45 frames).
4. **Auto-sweep on, 1x.** Click `1x`, toggle auto-sweep on. Timeline visibly sweeps left-to-right. Score increments when patterns clear. Round timer counts down (visible if game ends after 60s).
5. **Auto-sweep on, 0.5x.** Switch to `0.5x` mid-game. Sweep visibly slows; remaining timer roughly doubles.
6. **Auto-sweep off mid-game.** Toggle off. Sweep freezes; timer stops counting. Manual `S` still triggers an immediate sweep.
7. **Restart bug.** With training screen open, press `R`. Game restarts but stays in training mode (HUD still shows Practice controls; no invisible sweep clears blocks). Practice settings reset to `1x` / off.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Final commit (if any small fixes from manual testing)**

Only if needed:

```bash
git add -A
git commit -m "fix(training): manual-test follow-ups"
```

---

## Self-review notes

- **Spec coverage:** All sections covered — state shape (Task 1), actions (Tasks 2, 3), TICK behavior (Task 4), restart fix (Task 5), HUD UI (Task 6), edge cases (Task 4 covers mid-game toggles via test scenarios + Task 7 manual verification).
- **Type consistency:** `PracticeSpeedMultiplier` defined in `types/game.ts` (Task 1), reused in Tasks 2 and 6. Action types `SET_PRACTICE_SPEED` / `SET_PRACTICE_AUTO_SWEEP` consistent everywhere.
- **No placeholders:** Each step has full code. No "similar to above" handwaving.
- **Caveat on 2x sweep:** Documented up front — `Math.round(15/2) = 8` frames per column. Acceptable because practice mode doesn't record replays.
