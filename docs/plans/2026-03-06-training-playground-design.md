# Training Playground Design

**Date:** 2026-03-06

## Overview

A training mode that lets players freely explore combo-building strategies without time pressure. The goal is to help players internalize:
1. How to build long horizontal chains of same-color patterns
2. How to consolidate colors efficiently (dense/square combos > linear combos)
3. Where on the board to build (center placement = fewer moves)

---

## Architecture Decision

**Approach: mode flag in the existing reducer** (`mode: 'normal' | 'training'`).

Minimal disruption — all existing game infrastructure (seeded RNG, debug mode, replay) remains intact. Training behavior is a diff from normal mode, not a fork.

---

## State Changes (`src/types/game.ts`)

Add to `GameState`:

```ts
mode: 'normal' | 'training'   // default 'normal'
undoStack: GameState[]         // max 20 entries, cleared on RESTART
```

---

## Reducer Changes (`src/reducers/gameReducer.ts`)

In **training mode**, the following behavior changes apply:

| Normal | Training |
|--------|----------|
| Timeline auto-advances each TICK | Timeline frozen (never advances) |
| Block auto-drops on timer | Block is static — no auto-drop |
| `SOFT_DROP` available | `SOFT_DROP` disabled (no-op) |
| Game timer counts down 60s | No game timer |

**On `HARD_DROP` (or block lock):** push current state snapshot to `undoStack` before processing placement.

**New action: `MANUAL_SWEEP`**
- Runs a single full left-to-right timeline pass across all 16 columns
- Uses existing `processTimelineColumn()` logic from `src/utils/gameLogic/timeline.ts`
- Clears all detected patterns and applies gravity

**New action: `UNDO`**
- Pops top of `undoStack`
- Restores via existing `RESTORE_STATE` action path

**`START_GAME` updated** to accept optional `mode?: 'normal' | 'training'` parameter.

---

## Keyboard Controls (Training Mode)

| Key | Action |
|-----|--------|
| `←` / `→` | Move block left/right |
| `Z` / `X` | Rotate CCW / CW |
| `Space` | Hard drop (places block, saves undo snapshot) |
| `S` | Manual sweep (trigger full timeline pass) |
| `Ctrl+Z` | Undo last placement |

No soft drop in training mode.

---

## Board Overlays

Two visual overlays rendered on the game board in training mode:

### 1. Per-Cell Pattern Contribution Heat Map

Each cell that belongs to a detected pattern group shows a badge (1–4) indicating how many 2×2 patterns that cell participates in. Higher contribution = more efficiently placed cell.

- Computed from `detectedPatterns` array in `GameState`
- For each cell (x, y), count how many patterns in `detectedPatterns` include it
- Display: color intensity or small number badge per cell (1 = light tint, 4 = deep color)

### 2. Column Distance-from-Center Indicator

Subtle visual marker on each column showing distance from board center (columns 7–8).

- Distance: `Math.min(Math.abs(col - 7), Math.abs(col - 8))`
- Display: column header strip with gradient (center = neutral, edges = orange/red tint) or small number (0 at center, up to 7 at edges)
- Teaches players to keep combo-building near the center to minimize left/right movement

---

## Training HUD (`src/components/TrainingHUD/`)

A sidebar component rendered alongside the game board. Reads from `GameState`, computes metrics in real-time (no new state fields needed — all derived).

### Chain Length Meter

```
LIGHT chain  ████████░░  8
DARK  chain  █████░░░░░  5  ← dominant
```

- Computed from `detectedPatterns` using DP: longest connected horizontal run per color
- Each column extends the chain only if an adjacent column has a pattern within 1 row (same logic as `python/game/state.py`)
- Dominant color highlighted

### Combo Efficiency Display

For each contiguous group of same-color detected patterns:

```
Combo   Patterns  Cells  Efficiency
  ■       4        9      ●●●● 44%   (green)
  ■       2        6      ●●●  33%   (yellow)
```

- **Patterns**: count of 2×2 matches in the group
- **Cells**: count of unique cells occupied by those patterns
- **Efficiency**: `patterns / cells` — measures packing density
  - ≥ 40% green (dense, square-ish)
  - 25–40% yellow (linear chain)
  - < 25% red (sparse)
- Groups computed by flood-filling adjacently shared cells among `detectedPatterns`

### Undo Indicator

```
↩ 5 moves available
```

### Key Hint Strip

```
[S] Sweep   [Ctrl+Z] Undo
```

---

## Navigation & Routing

- New route `/training` → `TrainingScreen` (`src/screens/TrainingScreen/`)
- "Training" button added to `StartScreen` alongside Play / Rankings / Watch AI
- `TrainingScreen`: initializes with `mode: 'training'`, no score submission, no replay upload, no timer UI
- Board fill-up (unlikely but possible): show "Reset Board" option to clear and restart training without leaving the mode

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/types/game.ts` | Add `mode`, `undoStack` fields |
| `src/reducers/gameReducer.ts` | Handle training mode in TICK; add `MANUAL_SWEEP`, `UNDO` actions; snapshot on HARD_DROP |
| `src/reducers/actions/gameTick.ts` | Skip drop timer and timeline advance when `mode === 'training'` |
| `src/reducers/actions/placement.ts` | Push undo snapshot before processing HARD_DROP |
| `src/constants/gameConfig.ts` | No change needed |
| `src/screens/TrainingScreen/index.tsx` | New screen — wraps Game component with training config |
| `src/components/TrainingHUD/index.tsx` | New component — chain meter, efficiency display, undo indicator |
| `src/components/GameBoard/` | Add board overlay layer for heat map and column distance indicator |
| `src/App.tsx` | Add `/training` route |
| `src/screens/StartScreen.tsx` | Add "Training" navigation button |
| `src/utils/trainingMetrics.ts` | Utility functions: `computeChainLengths`, `groupComboPatterns`, `computeCellContributions`, `computeColumnDistances` |

---

## Reusable Existing Utilities

- `src/utils/gameLogic/patterns.ts` — `detectPatterns()` — no change needed, already computes `detectedPatterns`
- `src/utils/gameLogic/timeline.ts` — `processTimelineColumn()` — reused directly in `MANUAL_SWEEP`
- `src/utils/gameLogic/physics.ts` — `clearMarkedCellsAndApplyGravity()` — reused after sweep
- `src/reducers/actions/` — `RESTORE_STATE` action path — reused for UNDO

---

## Verification

1. `pnpm dev` → navigate to `/training` via Start screen button
2. Confirm blocks do not auto-drop; only `Space` places them
3. Confirm timeline does not move; press `S` to trigger a sweep and verify patterns clear
4. Place 3 blocks, press `Ctrl+Z` three times — confirm each undo restores prior board state
5. Verify TrainingHUD shows correct chain lengths and updates after each placement
6. Verify efficiency display correctly shows pattern count, cell count, and ratio
7. Verify per-cell heat map numbers match manual pattern-count inspection
8. Verify column distance indicator shows 0 at columns 7–8, increasing toward edges
9. `pnpm test` — ensure no regressions in existing game logic tests
