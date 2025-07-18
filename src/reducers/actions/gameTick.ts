import { TIMER_CONFIG } from '@/constants/gameConfig';
import type { GameState } from '@/types/game';
import { isValidPosition } from '@/utils/gameLogic/collision';
import { createPosition } from '@/utils/gameLogic/helpers';
import { detectPatterns } from '@/utils/gameLogic/patterns';
import { updateFallingColumns } from '@/utils/gameLogic/physics';
import { updateTimeline } from '@/utils/gameLogic/timeline';
import type { SeededRNGType } from '@/utils/seededRNG';

import { placeBlockAndApplyPhysics } from './placement';

/**
 * Handle countdown state logic
 */
function handleCountdown(state: GameState): GameState {
  // Simple countdown logic - every 60 frames decrements countdown
  const nextFrame = state.frame + 1;
  const countdownStep = Math.floor(nextFrame / TIMER_CONFIG.COUNTDOWN_DURATION);
  const newCountdown = TIMER_CONFIG.COUNTDOWN_START - countdownStep;

  if (newCountdown <= 0) {
    // Countdown finished, start playing
    return {
      ...state,
      status: 'playing',
      countdown: 0,
      frame: 0, // Reset frame counter to 0 when gameplay begins
    };
  }

  // Continue countdown
  return {
    ...state,
    countdown: newCountdown,
    frame: nextFrame,
  };
}

/**
 * Handle game timer for playing state
 */
function handleGameTimer(state: GameState): GameState {
  const newGameTimer = state.gameTimer - 1;

  // Check if time is up
  if (newGameTimer <= 0) {
    return {
      ...state,
      status: 'gameOver',
      gameTimer: 0,
      frame: state.frame + 1,
    };
  }

  return {
    ...state,
    gameTimer: newGameTimer,
    frame: state.frame + 1,
  };
}

/**
 * Handle countdown and timer logic
 */
export function handleCountdownAndTimer(state: GameState): GameState {
  if (state.status === 'countdown') {
    return handleCountdown(state);
  }

  if (state.status === 'playing') {
    return handleGameTimer(state);
  }

  return state;
}

/**
 * Handle block dropping logic - either move down or place block
 */
export function handleBlockDrop(
  state: GameState,
  frame: number,
  rng: SeededRNGType
): GameState {
  const newDropTimer = state.dropTimer + 1;

  // Check if block should drop
  if (newDropTimer >= state.dropInterval) {
    const dropPosition = createPosition(
      state.blockPosition.x,
      state.blockPosition.y + 1
    );

    // Try to move block down
    if (
      isValidPosition(
        state.board,
        state.currentBlock,
        dropPosition,
        state.fallingColumns
      ) === 'valid'
    ) {
      // Block can drop normally
      return {
        ...state,
        blockPosition: dropPosition,
        dropTimer: 0,
      };
    } else {
      // Can't drop, place block and apply physics
      const stateWithUpdatedTimer = { ...state, dropTimer: newDropTimer };
      return placeBlockAndApplyPhysics(stateWithUpdatedTimer, frame, rng);
    }
  }

  // Timer hasn't reached drop interval yet
  return {
    ...state,
    dropTimer: newDropTimer,
  };
}

/**
 * Update pattern detection
 */
export function updatePatternDetection(state: GameState): GameState {
  // Detect all current 2x2 patterns on the board
  const detectedPatterns = detectPatterns(state.board);

  return {
    ...state,
    detectedPatterns,
  };
}

/**
 * Handle game tick - main game loop logic
 */
export function handleGameTick(
  state: GameState,
  rng: SeededRNGType
): GameState {
  // First handle countdown and timer logic
  let newState = handleCountdownAndTimer(state);

  // Only process game logic if we're in playing state
  if (newState.status !== 'playing') {
    return newState;
  }

  // Handle block dropping and placement
  newState = handleBlockDrop(newState, newState.frame, rng);

  // Update pattern detection (only once per tick)
  newState = updatePatternDetection(newState);

  // Handle timeline progression and clearing
  newState = updateTimeline(newState);

  // Update falling columns
  const { newBoard, newFallingColumns } = updateFallingColumns(
    newState.board,
    newState.fallingColumns
  );

  newState = {
    ...newState,
    board: newBoard,
    fallingColumns: newFallingColumns,
  };

  return newState;
}
