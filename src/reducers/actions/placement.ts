import { DEFAULT_VALUES, TIMER_CONFIG } from '@/constants/gameConfig';
import type { GameState } from '@/types/game';
import {
  placeBlockOnBoard,
  canPlaceAnyPartOfBlock,
  generateRandomBlock,
} from '@/utils/gameLogic/blocks';
import { isValidPosition } from '@/utils/gameLogic/collision';
import { createFallingColumns } from '@/utils/gameLogic/physics';
import { findDropPosition } from '@/utils/gameLogic/validation';
import type { SeededRNGType } from '@/utils/seededRNG';

/**
 * Handle soft drop logic
 */
export function handleSoftDrop(
  state: GameState,
  rng: SeededRNGType
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const softDropPosition = {
    x: state.blockPosition.x,
    y: state.blockPosition.y + 1,
  };

  if (
    isValidPosition(
      state.board,
      state.currentBlock,
      softDropPosition,
      state.fallingColumns
    ) === 'valid'
  ) {
    return {
      ...state,
      blockPosition: softDropPosition,
      dropTimer: 0, // Reset drop timer
    };
  }

  // If can't drop, place block and apply gravity
  return placeBlockAndApplyPhysics(state, state.frame, rng);
}

/**
 * Handle hard drop logic
 */
export function handleHardDrop(
  state: GameState,
  rng: SeededRNGType
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const dropPosition = findDropPosition(
    state.board,
    state.currentBlock,
    state.blockPosition,
    state.fallingColumns
  );
  const newState = {
    ...state,
    blockPosition: dropPosition,
  };
  return placeBlockAndApplyPhysics(newState, newState.frame, rng);
}

/**
 * Place current block and apply all physics (gravity, spawning)
 */
export function placeBlockAndApplyPhysics(
  state: GameState,
  frame: number,
  rng: SeededRNGType
): GameState {
  // Place the block on the board
  const placedState = placeCurrentBlock(state, frame, rng);

  const { newFallingColumns, newBoard } = createFallingColumns(
    placedState.board,
    placedState.fallingColumns
  );

  // Apply gravity to settle all blocks
  const newState = {
    ...placedState,
    board: newBoard,
    fallingColumns: newFallingColumns,
  };

  return newState;
}

/**
 * Place current block on board and spawn next block with enhanced game over logic
 */
export function placeCurrentBlock(
  state: GameState,
  frame: number,
  rng: SeededRNGType
): GameState {
  const canPlaceBlock = canPlaceAnyPartOfBlock(
    state.board,
    state.blockPosition
  );

  if (!canPlaceBlock) {
    return {
      ...state,
      status: 'gameOver',
      frame,
    };
  }

  const newBoard = placeBlockOnBoard(
    state.board,
    state.fallingColumns,
    state.currentBlock,
    state.blockPosition
  );

  // Move first block from queue to current, add new block to end of queue
  const [nextBlock, ...remainingQueue] = state.queue;
  const newBlock = generateRandomBlock(rng);
  const newQueue = [...remainingQueue, newBlock];

  return {
    ...state,
    board: newBoard,
    currentBlock: nextBlock,
    queue: newQueue,
    blockPosition: { ...DEFAULT_VALUES.INITIAL_POSITION },
    dropTimer: 0,
    dropInterval: TIMER_CONFIG.FIXED_DROP_INTERVAL,
    rngState: rng.getState(),
    frame,
  };
}
