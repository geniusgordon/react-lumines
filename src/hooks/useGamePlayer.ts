import { useCallback, useRef, useEffect } from 'react';

import { useGame } from './useGame';
import { useGameLoop } from './useGameLoop';
import { useReplay } from './useReplay';
import { useSaveLoadReplay } from './useSaveLoadReplay';

export function useGamePlayer(initialSeed?: string, defaultDebugMode = false) {
  const {
    gameState,
    dispatch,
    startNewGame: baseStartNewGame,
  } = useGame(initialSeed, defaultDebugMode);

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
    (action: any) => {
      // Record input if we're recording
      if (replayState.isRecording) {
        recordInput(action);
      }

      // Always dispatch the action to game reducer
      dispatch(action);
    },
    [replayState.isRecording, recordInput, dispatch]
  );

  // Use the game loop with the enhanced dispatch function
  const gameLoop = useGameLoop(gameState, enhancedDispatch, {
    enabled: true,
    debugMode: gameState.debugMode,
  });

  // Start recording when a new game starts
  const startNewGame = useCallback(() => {
    startRecording();
    baseStartNewGame();
  }, [baseStartNewGame, startRecording]);

  return {
    gameState,
    replayState,
    gameLoop,
    dispatch: enhancedDispatch,
    startNewGame,
    exportReplay,
    stopRecording,
  };
}
