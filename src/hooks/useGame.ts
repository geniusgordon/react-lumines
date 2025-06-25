import { useReducer, useCallback } from 'react';

import {
  gameReducerWithDebug,
  createInitialGameState,
} from '@/reducers/gameReducer';

export function useGame(initialSeed?: string, defaultDebugMode = false) {
  const [gameState, dispatch] = useReducer(
    gameReducerWithDebug,
    createInitialGameState(initialSeed, defaultDebugMode)
  );

  // Start new game
  const startNewGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, [dispatch]);

  return {
    gameState,
    dispatch,
    startNewGame,
  };
}
