import type { GameState, GameAction } from '@/types/game';
import { rotateBlockPattern } from '@/utils/gameLogic/blocks';
import { isValidPosition } from '@/utils/gameLogic/collision';
import {
  validateAndApplyMove,
  createPosition,
} from '@/utils/gameLogic/helpers';

/**
 * Handle block movement (left/right)
 */
export function handleBlockMovement(
  state: GameState,
  _action: GameAction,
  direction: 'left' | 'right'
): GameState {
  const offset = direction === 'left' ? -1 : 1;
  const newPosition = createPosition(
    state.blockPosition.x + offset,
    state.blockPosition.y
  );

  const isValid =
    isValidPosition(
      state.board,
      state.currentBlock,
      newPosition,
      state.fallingColumns
    ) === 'valid';

  return validateAndApplyMove(state, isValid, state => ({
    ...state,
    blockPosition: newPosition,
  }));
}

/**
 * Handle block rotation (CW/CCW)
 */
export function handleBlockRotation(
  state: GameState,
  _action: GameAction,
  direction: 'cw' | 'ccw'
): GameState {
  const clockwise = direction === 'cw';
  const newPattern = rotateBlockPattern(state.currentBlock.pattern, clockwise);

  // Test if the rotated block can be placed at current position
  const testBlock = {
    ...state.currentBlock,
    pattern: newPattern,
  };

  const isValid =
    isValidPosition(
      state.board,
      testBlock,
      state.blockPosition,
      state.fallingColumns
    ) === 'valid';

  return validateAndApplyMove(state, isValid, state => ({
    ...state,
    currentBlock: testBlock,
  }));
}
