import type { GameState, Position, GameBoard } from '@/types/game';

/**
 * Block height constant to replace magic number 2
 */
export const BLOCK_HEIGHT = 2;

/**
 * Check if game is in playing state
 */
export function isPlayingState(state: GameState): boolean {
  return state.status === 'playing';
}

/**
 * Factory function for creating position objects
 */
export function createPosition(x: number, y: number): Position {
  return { x, y };
}

/**
 * Create a deep copy of game board
 */
export function copyBoard(board: GameBoard): GameBoard {
  return board.map(row => [...row]);
}

/**
 * Check if a value is within bounds
 */
export function isInBounds(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Create a coordinate string for set operations
 */
export function coordToString(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Validate and apply a game state update if conditions are met
 */
export function validateAndApplyMove(
  state: GameState,
  isValid: boolean,
  updateFn: (state: GameState) => GameState
): GameState {
  if (!isPlayingState(state)) {
    return state;
  }

  if (isValid) {
    return updateFn(state);
  }

  return state;
}
