import { useCallback, useRef, useEffect, useMemo } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import { useGame, type UseGameActions } from './useGame';
import { useGameLoop, type UseGameLoopReturn } from './useGameLoop';
import { useReplayRecorder } from './useReplayRecorder';
import { useSaveLoadReplay } from './useSaveLoadReplay';

// Return type for useReplayPlayer hook
export interface UseGamePlayerReturn {
  gameState: GameState;
  actions: UseGameActions;
  gameLoop: UseGameLoopReturn;
  exportReplay: () => ReplayData | null;
}

export function useGamePlayer(
  initialSeed?: string,
  defaultDebugMode = false
): UseGamePlayerReturn {
  const { gameState, actions, _dispatch } = useGame(
    initialSeed,
    defaultDebugMode
  );

  const { startRecording, recordInput, exportReplay } =
    useReplayRecorder(gameState);

  const { saveReplay } = useSaveLoadReplay();

  // Track previous game status to detect game over transition
  const prevGameStatus = useRef(gameState.status);

  // Auto-stop recording and save replay when game over occurs
  useEffect(() => {
    if (
      prevGameStatus.current !== 'gameOver' &&
      gameState.status === 'gameOver'
    ) {
      // Export and save the replay
      const replayData = exportReplay();
      if (replayData) {
        // Generate a descriptive name with timestamp and score
        const timestamp = new Date().toLocaleString();
        const replayName = `Game ${timestamp} - Score: ${gameState.score}`;

        const saveResult = saveReplay(replayData, replayName);

        if (saveResult.success) {
          console.log(`Game Over - Replay saved: "${replayName}"`);
        } else {
          console.error('Failed to save replay:', saveResult.error?.message);
        }
      } else {
        console.warn('Game Over - No replay data to save');
      }
    }

    // Update previous status
    prevGameStatus.current = gameState.status;
  }, [gameState.status, gameState.score, exportReplay, saveReplay]);

  // Enhanced dispatch that includes recording
  const enhancedDispatch = useCallback(
    (action: GameAction) => {
      recordInput(action);
      _dispatch(action);
    },
    [recordInput, _dispatch]
  );

  // Create enhanced actions that include recording
  const enhancedActions = useMemo(() => {
    const recordAndExecute = <T extends any[]>(
      actionType: GameAction['type'],
      originalAction: (...args: T) => void
    ) => {
      return (...args: T) => {
        recordInput({ type: actionType });
        originalAction(...args);
      };
    };

    return {
      moveLeft: recordAndExecute('MOVE_LEFT', actions.moveLeft),
      moveRight: recordAndExecute('MOVE_RIGHT', actions.moveRight),
      rotateCW: recordAndExecute('ROTATE_CW', actions.rotateCW),
      rotateCCW: recordAndExecute('ROTATE_CCW', actions.rotateCCW),
      softDrop: recordAndExecute('SOFT_DROP', actions.softDrop),
      hardDrop: recordAndExecute('HARD_DROP', actions.hardDrop),
      tick: recordAndExecute('TICK', actions.tick),
      pause: actions.pause,
      resume: actions.resume,
      startNewGame: actions.startNewGame,
      restartGame: (seed?: string) => {
        actions.restartGame(seed);
      },
      setDebugMode: actions.setDebugMode,
      skipCountdown: actions.skipCountdown,
    };
  }, [actions, recordInput]);

  // Create onFrame callback that dispatches TICK actions
  const onFrame = useCallback(() => {
    enhancedDispatch({
      type: 'TICK',
    });
  }, [enhancedDispatch]);

  // Use the game loop with the onFrame callback
  const gameLoop = useGameLoop(onFrame, {
    enabled: gameState.status === 'playing' || gameState.status === 'countdown',
    debugMode: gameState.debugMode,
  });

  // Start recording when a new game starts
  const startNewGame = useCallback(() => {
    startRecording();
    actions.startNewGame();
  }, [actions, startRecording]);

  useEffect(() => {
    if (gameState.status === 'initial') {
      startNewGame();
    }
  }, [gameState.status, startNewGame]);

  return {
    gameState,
    gameLoop,
    actions: enhancedActions,
    exportReplay,
  };
}
