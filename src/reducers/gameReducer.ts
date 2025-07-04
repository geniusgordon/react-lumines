import type { GameState, GameAction } from '@/types/game';
import { logDebugAction } from '@/utils/debugLogger';
import { SeededRNG, type SeededRNGType } from '@/utils/seededRNG';

import {
  handleBlockMovement,
  handleBlockRotation,
  handleSoftDrop,
  handleHardDrop,
  handleStartGame,
  handlePause,
  handleResume,
  handleRestart,
  handleSkipCountdown,
  handleSetDebugMode,
  handleRestoreState,
  handleGameTick,
} from './actions';

// Re-export for backward compatibility
export { createInitialGameState } from './gameState';

/**
 * Main game state reducer
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  // Create RNG instance only when needed - most actions don't need RNG
  let rng: SeededRNGType | null = null;
  const getRNG = (): SeededRNGType => {
    if (!rng) {
      rng = new SeededRNG(state.seed);
      rng.setState(state.rngState);
    }
    return rng;
  };

  switch (action.type) {
    case 'START_GAME':
      return handleStartGame(state);

    case 'PAUSE':
      return handlePause(state);

    case 'RESUME':
      return handleResume(state);

    case 'RESTART':
      return handleRestart(state, action);

    case 'SKIP_COUNTDOWN':
      return handleSkipCountdown(state);

    case 'SET_DEBUG_MODE':
      return handleSetDebugMode(state, action);

    case 'RESTORE_STATE':
      return handleRestoreState(state, action);

    case 'MOVE_LEFT':
      return handleBlockMovement(state, action, 'left');

    case 'MOVE_RIGHT':
      return handleBlockMovement(state, action, 'right');

    case 'ROTATE_CW':
      return handleBlockRotation(state, action, 'cw');

    case 'ROTATE_CCW':
      return handleBlockRotation(state, action, 'ccw');

    case 'SOFT_DROP':
      return handleSoftDrop(state, getRNG());

    case 'HARD_DROP':
      return handleHardDrop(state, getRNG());

    case 'TICK':
      return handleGameTick(state, getRNG());

    default:
      if (state.debugMode) {
        console.warn(`🐛 Unknown action type: ${action.type}`, action);
      }
      return state;
  }
}

/**
 * Debug-aware wrapper for gameReducer that logs state changes
 */
export function gameReducerWithDebug(
  state: GameState,
  action: GameAction
): GameState {
  const newState = gameReducer(state, action);

  // Log the final state changes if debug mode is enabled
  if (state.debugMode) {
    logDebugAction(state, action, newState);
  }

  return newState;
}
