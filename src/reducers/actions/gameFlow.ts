import { createInitialGameState } from '@/reducers/gameState/initialState';
import type { GameState, GameAction } from '@/types/game';

import { handleSetPracticeSpeed, handleSetPracticeAutoSweep } from './training';

/**
 * Handle game start action
 */
export function handleStartGame(state: GameState): GameState {
  return {
    ...state,
    status: 'countdown',
  };
}

/**
 * Handle pause action
 */
export function handlePause(state: GameState): GameState {
  if (state.status === 'playing') {
    return { ...state, status: 'paused' };
  } else if (state.status === 'countdown') {
    return { ...state, status: 'countdownPaused' };
  }
  return state;
}

/**
 * Handle resume action
 */
export function handleResume(state: GameState): GameState {
  if (state.status === 'paused') {
    return { ...state, status: 'playing' };
  } else if (state.status === 'countdownPaused') {
    return { ...state, status: 'countdown' };
  }
  return state;
}

/**
 * Handle restart action
 */
export function handleRestart(state: GameState, action: GameAction): GameState {
  const seed = action.payload as string;
  // Preserve the recorded block queue across restarts so a replay can be
  // restarted by `RESTART` (used by `useReplayPlayer.restartReplay`) without
  // diverging from the original block sequence.
  let next = createInitialGameState(
    seed,
    state.debugMode,
    state.mode,
    state.recordedBlockQueue
  );
  if (next.mode === 'training' && state.practice) {
    next = handleSetPracticeSpeed(next, {
      type: 'SET_PRACTICE_SPEED',
      payload: state.practice.speedMultiplier,
    });
    if (state.practice.autoSweep) {
      next = handleSetPracticeAutoSweep(next, {
        type: 'SET_PRACTICE_AUTO_SWEEP',
        payload: true,
      });
    }
  }
  return next;
}

/**
 * Handle skip countdown action
 */
export function handleSkipCountdown(state: GameState): GameState {
  if (state.status === 'countdown' || state.status === 'countdownPaused') {
    return {
      ...state,
      status: 'playing',
      countdown: 0,
    };
  }
  return state;
}
