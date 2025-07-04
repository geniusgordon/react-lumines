import { createInitialGameState } from '@/reducers/gameState/initialState';
import type { GameState, GameAction } from '@/types/game';

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
  return createInitialGameState(seed, state.debugMode);
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
