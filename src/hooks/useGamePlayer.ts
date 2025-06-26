import { useCallback, useRef, useEffect, useMemo } from 'react';

import type { GameAction } from '@/types/game';

import { useGame } from './useGame';
import { useGameLoop } from './useGameLoop';
import { useReplay } from './useReplay';
import { useSaveLoadReplay } from './useSaveLoadReplay';

export function useGamePlayer(initialSeed?: string, defaultDebugMode = false) {
  const { gameState, actions, _dispatch } = useGame(
    initialSeed,
    defaultDebugMode
  );

  const {
    replayState,
    startRecording,
    stopRecording,
    recordInput,
    exportReplay,
  } = useReplay(gameState);

  const { saveReplay } = useSaveLoadReplay();

  // Track previous game status to detect game over transition
  const prevGameStatus = useRef(gameState.status);

  // Auto-stop recording and save replay when game over occurs
  useEffect(() => {
    if (
      prevGameStatus.current !== 'gameOver' &&
      gameState.status === 'gameOver'
    ) {
      // Only stop recording and save if we're currently recording
      if (replayState.isRecording && !replayState.isPlayback) {
        stopRecording();

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
    }

    // Update previous status
    prevGameStatus.current = gameState.status;
  }, [
    gameState.status,
    gameState.score,
    replayState.isRecording,
    replayState.isPlayback,
    stopRecording,
    exportReplay,
    saveReplay,
  ]);

  // Enhanced dispatch that includes recording
  const enhancedDispatch = useCallback(
    (action: GameAction) => {
      // Record input if we're recording
      if (replayState.isRecording) {
        recordInput(action);
      }

      // Dispatch to the game reducer
      _dispatch(action);
    },
    [replayState.isRecording, recordInput, _dispatch]
  );

  // Create enhanced actions that include recording
  const enhancedActions = useMemo(() => {
    const recordAndExecute = (
      actionType: GameAction['type'],
      originalAction: () => void
    ) => {
      return () => {
        // Record the action if recording
        if (replayState.isRecording) {
          recordInput({ type: actionType });
        }
        // Execute the original action
        originalAction();
      };
    };

    return {
      moveLeft: recordAndExecute('MOVE_LEFT', actions.moveLeft),
      moveRight: recordAndExecute('MOVE_RIGHT', actions.moveRight),
      rotateCW: recordAndExecute('ROTATE_CW', actions.rotateCW),
      rotateCCW: recordAndExecute('ROTATE_CCW', actions.rotateCCW),
      softDrop: recordAndExecute('SOFT_DROP', actions.softDrop),
      hardDrop: recordAndExecute('HARD_DROP', actions.hardDrop),
      pause: recordAndExecute('PAUSE', actions.pause),
      resume: recordAndExecute('RESUME', actions.resume),
      tick: recordAndExecute('TICK', actions.tick),
      startNewGame: actions.startNewGame, // Special handling below
      restartGame: recordAndExecute('RESTART', actions.restartGame),
      setDebugMode: actions.setDebugMode, // Debug actions don't need recording
    };
  }, [actions, replayState.isRecording, recordInput]);

  // Use the game loop with the enhanced dispatch function
  const gameLoop = useGameLoop(gameState, enhancedDispatch, {
    enabled: true,
    debugMode: gameState.debugMode,
  });

  // Start recording when a new game starts
  const startNewGame = useCallback(() => {
    startRecording();
    actions.startNewGame();
  }, [actions, startRecording]);

  return {
    gameState,
    replayState,
    gameLoop,
    actions: enhancedActions,
    startNewGame,
    exportReplay,
    stopRecording,
  };
}
