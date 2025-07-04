import { GAME_CONFIG } from '@/constants/gameConfig';
import type { GameState, Square } from '@/types/game';

import { isPlayingState } from './helpers';
import {
  detectPatterns,
  getPatternsByLeftColumn,
  markColumnCells,
} from './patterns';
import { clearMarkedCellsAndApplyGravity } from './physics';

/**
 * Update timeline sweep progression with column-based clearing logic
 */
export function updateTimeline(state: GameState): GameState {
  if (!isPlayingState(state)) {
    return state;
  }

  const newTimer = state.timeline.timer + 1;

  // Check if it's time to move timeline one column
  if (newTimer >= state.timeline.sweepInterval) {
    return advanceTimelineToNextColumn(state);
  }

  // Just increment timer
  return {
    ...state,
    timeline: {
      ...state.timeline,
      timer: newTimer,
    },
  };
}

/**
 * Advance timeline to next column and process the current column
 */
export function advanceTimelineToNextColumn(state: GameState): GameState {
  const currentColumn = state.timeline.x;
  const nextColumn = (currentColumn + 1) % GAME_CONFIG.board.width;

  // Process the current column before moving
  const processedState = processTimelineColumn(state, nextColumn);

  return {
    ...processedState,
    timeline: {
      ...processedState.timeline,
      x: nextColumn,
      timer: 0, // Reset timer for next column
    },
  };
}

/**
 * Process a single column when timeline passes through it
 */
export function processTimelineColumn(
  state: GameState,
  column: number
): GameState {
  const patternsInColumn = getPatternsByLeftColumn(
    state.detectedPatterns,
    column
  );
  const patternsInPreviousColumn = getPatternsByLeftColumn(
    state.detectedPatterns,
    column - 1
  );

  const hasPatternsInCurrentColumn = patternsInColumn.length > 0;
  const hasPatternsInPreviousColumn = patternsInPreviousColumn.length > 0;

  // Case 1: Mark cells for clearing if there are patterns
  if (hasPatternsInCurrentColumn || hasPatternsInPreviousColumn) {
    return markCellsForClearing(state, column, patternsInColumn);
  }

  // Case 2: Clear marked cells if no patterns and we have holding score
  const shouldClear =
    !hasPatternsInCurrentColumn &&
    !hasPatternsInPreviousColumn &&
    state.timeline.holdingScore > 0 &&
    state.markedCells.length > 0;

  if (shouldClear) {
    return clearMarkedCellsAndScore(state);
  }

  return state;
}

/**
 * Mark cells for clearing and update holding score
 */
export function markCellsForClearing(
  state: GameState,
  column: number,
  patternsInColumn: Square[]
): GameState {
  // Calculate holding points for patterns in current column
  const holdingPoints = patternsInColumn.length;

  // Mark cells in this column for clearing
  const newMarkedCells = markColumnCells(column, state.detectedPatterns);

  // Single state update with all changes
  return {
    ...state,
    timeline: {
      ...state.timeline,
      holdingScore: state.timeline.holdingScore + holdingPoints,
    },
    markedCells: [...state.markedCells, ...newMarkedCells],
  };
}

/**
 * Clear marked cells and update score
 */
export function clearMarkedCellsAndScore(state: GameState): GameState {
  const { newBoard, newFallingColumns } = clearMarkedCellsAndApplyGravity(
    state.board,
    state.markedCells,
    state.fallingColumns
  );
  const detectedPatterns = detectPatterns(newBoard);

  return {
    ...state,
    board: newBoard,
    fallingColumns: newFallingColumns,
    detectedPatterns,
    score: state.score + state.timeline.holdingScore,
    timeline: {
      ...state.timeline,
      holdingScore: 0,
    },
    markedCells: [],
  };
}
