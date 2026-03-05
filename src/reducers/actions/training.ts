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
