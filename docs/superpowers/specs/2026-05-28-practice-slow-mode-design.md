# Practice / Slow Mode Design

**Date:** 2026-05-28
**Scope:** Extend the existing `/training` route with adjustable speed and an
optional auto-sweep mode, and fix a restart bug that drops the training mode
flag.

## Goal

Give players a practice surface where they can:

1. Slow down (or speed up) block drop and timeline sweep to study mechanics
   and combo timing.
2. Optionally turn on auto-sweep with a scaled 60s round timer to practice
   under realistic conditions.
3. Keep today's manual training tools (manual `S` sweep, `A` undo) working
   unchanged when auto-sweep is off.

## User-facing behavior

Training screen (`/training`) gains two controls in the `TrainingHUD`:

- **Speed multiplier** — segmented buttons `0.25x`, `0.5x`, `1x`, `2x`.
  Default `1x`.
- **Auto-sweep toggle** — boolean. Default off (current behavior preserved).

Behavior matrix:

| Auto-sweep | Drop speed                  | Timeline sweep              | Round timer            |
|------------|-----------------------------|-----------------------------|------------------------|
| off        | scaled by multiplier        | none (manual `S` only)      | none                   |
| on         | scaled by multiplier        | scaled by multiplier        | runs, scaled           |

Manual `S` (sweep) and `A` (undo) remain available regardless of auto-sweep —
they are orthogonal training tools.

## Architecture

### State shape

Add an optional field to `GameState` (in `src/types/game.ts`):

```ts
practice?: {
  speedMultiplier: 0.25 | 0.5 | 1 | 2;
  autoSweep: boolean;
};
```

Initialized in `createInitialGameState` only when `mode === 'training'`,
defaulting to `{ speedMultiplier: 1, autoSweep: false }`. Normal mode leaves
the field undefined and ignores it.

The practice settings live inside `GameState` (not React state) because the
reducer's `TICK` reads them every frame to compute effective intervals.
Keeping them inside the deterministic state also keeps the reducer's TICK
logic pure and avoids action-payload plumbing.

### Actions

Two new actions in `GameAction`:

- `SET_PRACTICE_SPEED` — payload: `0.25 | 0.5 | 1 | 2`.
- `SET_PRACTICE_AUTO_SWEEP` — payload: `boolean`.

Both are ignored when `mode !== 'training'`.

### Reducer changes (`src/reducers/actions/gameTick.ts`)

When `state.mode === 'training'`, compute effective intervals at the top of
`TICK`:

- `dropInterval = round(FIXED_DROP_INTERVAL / speedMultiplier)` — used for
  the falling-piece drop timing.
- If `practice.autoSweep === true`:
  - Run the normal sweep + round-timer path (the same code path as
    `mode === 'normal'`), but with:
    - `sweepInterval = round(TIMELINE_SWEEP_INTERVAL / speedMultiplier)`
    - Round-timer decrements by `speedMultiplier` per frame (equivalently:
      effective `GAME_DURATION_FRAMES = round(3600 / speedMultiplier)`).
- If `practice.autoSweep === false`: keep today's training behavior — no
  sweep advancement, no round-timer countdown.

The four supported multipliers all divide cleanly into the base intervals
(`FIXED_DROP_INTERVAL = 90`, `TIMELINE_SWEEP_INTERVAL = 15`), so all derived
intervals are integers — determinism is preserved.

### Restart fix (`src/reducers/actions/gameFlow.ts`)

Current bug:

```ts
export function handleRestart(state, action) {
  const seed = action.payload as string;
  return createInitialGameState(seed, state.debugMode);
  // ↑ drops state.mode → reverts to 'normal'
}
```

After pressing `R` on the training screen, the new state has `mode: 'normal'`,
so `gameTick` resumes normal sweeping and the round timer. The
`TrainingScreen` UI doesn't render this correctly, producing the "timeline
sweeps and clears but isn't visible" symptom.

Fix: forward `state.mode` (and reset `practice` to its default while keeping
the same shape) when restarting:

```ts
return createInitialGameState(seed, state.debugMode, state.mode);
```

`createInitialGameState` already takes a `mode` parameter; it just wasn't
being passed.

### UI changes (`src/components/TrainingHUD`)

Add two controls bound to the new actions:

- Segmented "Speed" buttons (`0.25x` / `0.5x` / `1x` / `2x`) — clicking a
  button dispatches `SET_PRACTICE_SPEED`.
- "Auto sweep (timed round)" toggle — dispatches `SET_PRACTICE_AUTO_SWEEP`.

Both reflect `gameState.practice` so the UI stays in sync if the state is
restored from a branch.

## Data flow

```
TrainingHUD click
  → dispatch SET_PRACTICE_SPEED / SET_PRACTICE_AUTO_SWEEP
    → reducer writes practice.* into GameState
      → next TICK reads practice.* to compute intervals
        → drop / sweep / timer advance accordingly
```

No new game-loop wiring, no new hooks. Existing `useGame` /
`useGameLoop` / `useGameControls` keep working unchanged.

## Edge cases

- **Changing speed mid-game.** Takes effect on the next TICK. No visual
  glitch because intervals are recomputed every frame.
- **Toggling auto-sweep on mid-game.** Sweep resumes from the current
  `timeline.x` position; round timer starts decrementing from full duration.
- **Toggling auto-sweep off mid-game.** Sweep freezes in place; timer
  stops. Manual `S` still works.
- **Manual `S` while auto-sweep is on.** Same behavior as today — the
  manual action triggers an immediate sweep cycle on top of the running
  auto-sweep. (No behavior change to `MANUAL_SWEEP`.)
- **Restart in training.** Preserves `mode: 'training'`. Practice settings
  reset to defaults (`1x`, auto-sweep off) — a clean slate for the next
  practice run. (We don't carry settings across restarts because users may
  want to reset to a known baseline.)

## Testing

- **`gameReducer` tests** (`src/reducers/__tests__/...`):
  - `SET_PRACTICE_SPEED` and `SET_PRACTICE_AUTO_SWEEP` update state.
  - With `autoSweep: false`, `TICK` does not advance the timeline or timer.
  - With `autoSweep: true` at `0.5x`, sweep advances every 30 frames
    (vs 15 at `1x`); round lasts 7200 frames (vs 3600).
  - At `2x`, drop interval is 45 frames and round lasts 1800 frames.
- **`handleRestart` test**: restart while `mode === 'training'` returns
  state with `mode: 'training'` and a fresh `practice` default.
- **`TrainingHUD` component test**: clicking each speed preset dispatches
  `SET_PRACTICE_SPEED` with the right value; toggling auto-sweep dispatches
  `SET_PRACTICE_AUTO_SWEEP`.

## Out of scope

- Continuous speed slider (presets are enough; avoids non-integer interval
  rounding).
- Persisting practice settings across sessions (localStorage).
- Speed controls on normal / replay / AI screens.
- Recording or sharing practice runs.
- New keyboard shortcuts for speed presets (clickable UI only for now).
