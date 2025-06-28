import { useCallback, useRef, useEffect, useMemo } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import {
  validateReplayData,
  expandReplayData,
  type FrameActions,
} from '@/utils/replayUtils';

import { useGame, type UseGameActions } from './useGame';
import { useGameLoop, type UseGameLoopReturn } from './useGameLoop';

// Return type for useReplayPlayer hook
export interface UseReplayPlayerReturn {
  gameState: GameState;
  actions: UseGameActions;
  gameLoop: UseGameLoopReturn;
}

export function useReplayPlayer(replayData: ReplayData): UseReplayPlayerReturn {
  const { gameState, actions, _dispatch } = useGame(replayData?.seed, false);

  // Replay data references
  const frameActionsRef = useRef<FrameActions[]>([]);
  const currentFrameRef = useRef<number>(0);

  // Error handling for replay issues
  const handleReplayError = useCallback(
    (error: string, action?: GameAction) => {
      console.error(`Replay error: ${error}`, action);
    },
    []
  );

  // Dispatch all actions for current frame
  const dispatchFrameActions = useCallback(() => {
    if (gameState.status === 'countdown') {
      _dispatch({ type: 'TICK' });
      return;
    }

    const currentFrame = currentFrameRef.current;
    const frameActions = frameActionsRef.current;

    const frameData = frameActions[currentFrame];

    for (const userAction of frameData.userActions) {
      _dispatch(userAction);
    }

    _dispatch({ type: 'TICK' });

    currentFrameRef.current = currentFrame + 1;
  }, [_dispatch, gameState.status]);

  const gameLoop = useGameLoop(dispatchFrameActions, {
    enabled: gameState.status === 'playing' || gameState.status === 'countdown',
  });

  const startReplay = useCallback(
    (replayData: ReplayData) => {
      try {
        // Comprehensive validation of entire replay data
        const validation = validateReplayData(replayData);

        if (!validation.valid) {
          throw new Error(
            `Replay validation failed:\n${validation.errors.join('\n')}`
          );
        }

        // Expand replay data into frame-based structure
        const frameActions = expandReplayData(replayData);
        frameActionsRef.current = frameActions;

        // Reset frame index
        currentFrameRef.current = 0;

        // Initialize game with replay seed first
        _dispatch({ type: 'START_GAME' });
      } catch (error) {
        handleReplayError(
          `Failed to start replay: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [_dispatch, handleReplayError]
  );

  const restartReplay = useCallback(() => {
    _dispatch({
      type: 'RESTART',
      payload: replayData.seed,
    });
  }, [_dispatch, replayData.seed]);

  // Auto-start replay when game state is initial
  useEffect(() => {
    if (gameState.status === 'initial') {
      startReplay(replayData);
    }
  }, [gameState.status, replayData, startReplay]);

  // Create actions object similar to useGamePlayer pattern
  const replayActions = useMemo<UseGameActions>(
    () => ({
      // Game actions (no-ops for replay mode)
      moveLeft: () => {},
      moveRight: () => {},
      rotateCW: () => {},
      rotateCCW: () => {},
      softDrop: () => {},
      hardDrop: () => {},
      tick: () => {},
      startNewGame: actions.startNewGame,
      restartGame: restartReplay,
      setDebugMode: actions.setDebugMode,
      skipCountdown: () => {},
      pause: actions.pause,
      resume: actions.resume,
    }),
    [
      actions.startNewGame,
      actions.setDebugMode,
      actions.pause,
      actions.resume,
      restartReplay,
    ]
  );

  return {
    gameState,
    actions: replayActions,
    gameLoop,
  };
}
