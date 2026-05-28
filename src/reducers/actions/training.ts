import type { GameState, GameAction, PracticeSpeedMultiplier } from '@/types/game';
import { detectPatterns, getPatternCells } from '@/utils/gameLogic/patterns';
import { clearMarkedCellsAndApplyGravity } from '@/utils/gameLogic/physics';
import { TIMER_CONFIG } from '@/constants/gameConfig';

const BASE_DROP_INTERVAL = TIMER_CONFIG.FIXED_DROP_INTERVAL;
const BASE_SWEEP_INTERVAL = TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL;

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
    for (const cell of getPatternCells(pattern)) {
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
