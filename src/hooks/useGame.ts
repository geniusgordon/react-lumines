import { useReducer, useCallback } from 'react';

import {
  gameReducerWithDebug,
  createInitialGameState,
} from '@/reducers/gameReducer';
import type { GameAction } from '@/types/game';

export interface UseGameActions {
  moveLeft: () => void;
  moveRight: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  softDrop: () => void;
  hardDrop: () => void;
  pause: () => void;
  resume: () => void;
  tick: () => void;
  startNewGame: () => void;
  restartGame: () => void;
  setDebugMode: (enabled: boolean) => void;
}

export interface UseGameReturn {
  gameState: ReturnType<typeof createInitialGameState>;
  actions: UseGameActions;
  // Internal dispatch for advanced usage (game loop, replay system)
  _dispatch: React.Dispatch<GameAction>;
}

export function useGame(
  initialSeed?: string,
  defaultDebugMode = false
): UseGameReturn {
  const [gameState, dispatch] = useReducer(
    gameReducerWithDebug,
    createInitialGameState(initialSeed, defaultDebugMode)
  );

  // Movement actions
  const moveLeft = useCallback(() => {
    dispatch({ type: 'MOVE_LEFT' });
  }, []);

  const moveRight = useCallback(() => {
    dispatch({ type: 'MOVE_RIGHT' });
  }, []);

  // Rotation actions
  const rotateCW = useCallback(() => {
    dispatch({ type: 'ROTATE_CW' });
  }, []);

  const rotateCCW = useCallback(() => {
    dispatch({ type: 'ROTATE_CCW' });
  }, []);

  // Drop actions
  const softDrop = useCallback(() => {
    dispatch({ type: 'SOFT_DROP' });
  }, []);

  const hardDrop = useCallback(() => {
    dispatch({ type: 'HARD_DROP' });
  }, []);

  // Game flow actions
  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  const tick = useCallback(() => {
    dispatch({ type: 'TICK' });
  }, []);

  const startNewGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const restartGame = useCallback(() => {
    dispatch({ type: 'RESTART', payload: initialSeed });
  }, [initialSeed]);

  // Debug actions
  const setDebugMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_DEBUG_MODE', payload: enabled });
  }, []);

  const actions: UseGameActions = {
    moveLeft,
    moveRight,
    rotateCW,
    rotateCCW,
    softDrop,
    hardDrop,
    pause,
    resume,
    tick,
    startNewGame,
    restartGame,
    setDebugMode,
  };

  return {
    gameState,
    actions,
    _dispatch: dispatch,
  };
}
