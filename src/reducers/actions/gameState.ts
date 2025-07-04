import type { GameState, GameAction } from '@/types/game';

/**
 * Handle set debug mode action
 */
export function handleSetDebugMode(
  state: GameState,
  action: GameAction
): GameState {
  const newDebugMode = action.payload as boolean;
  return {
    ...state,
    debugMode: newDebugMode,
  };
}

/**
 * Handle restore state action
 */
export function handleRestoreState(
  state: GameState,
  action: GameAction
): GameState {
  const restoredState = action.payload as GameState;
  // Preserve debug mode from current state
  return {
    ...restoredState,
    debugMode: state.debugMode,
  };
}
