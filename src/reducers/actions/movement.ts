import type { GameState, GameAction } from '@/types/game';
import { rotateBlockPattern } from '@/utils/gameLogic/blocks';
import { isValidPosition } from '@/utils/gameLogic/collision';

/**
 * Handle block movement (left/right)
 */
export function handleBlockMovement(
  state: GameState,
  _action: GameAction,
  direction: 'left' | 'right'
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const offset = direction === 'left' ? -1 : 1;
  const newPosition = {
    x: state.blockPosition.x + offset,
    y: state.blockPosition.y,
  };

  if (
    isValidPosition(
      state.board,
      state.currentBlock,
      newPosition,
      state.fallingColumns
    ) === 'valid'
  ) {
    return {
      ...state,
      blockPosition: newPosition,
    };
  }

  return state;
}

/**
 * Handle block rotation (CW/CCW)
 */
export function handleBlockRotation(
  state: GameState,
  _action: GameAction,
  direction: 'cw' | 'ccw'
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const clockwise = direction === 'cw';
  const newPattern = rotateBlockPattern(state.currentBlock.pattern, clockwise);

  // Test if the rotated block can be placed at current position
  const testBlock = {
    ...state.currentBlock,
    pattern: newPattern,
  };

  if (
    isValidPosition(
      state.board,
      testBlock,
      state.blockPosition,
      state.fallingColumns
    ) === 'valid'
  ) {
    return {
      ...state,
      currentBlock: testBlock,
    };
  }

  return state;
}
