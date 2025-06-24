import { useReducer, useCallback, useRef, useEffect } from 'react';

import {
  gameReducerWithDebug,
  createInitialGameState,
} from '@/reducers/gameReducer';
import type { GameAction, GameActionType } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import { useGameLoop } from './useGameLoop';
import { useReplay } from './useReplay';
import { useSaveLoadReplay } from './useSaveLoadReplay';

// Type guard to validate replay input actions
function isValidReplayAction(type: string): type is GameActionType {
  const validActions: GameActionType[] = [
    'MOVE_LEFT',
    'MOVE_RIGHT',
    'ROTATE_CW',
    'ROTATE_CCW',
    'SOFT_DROP',
    'HARD_DROP',
    'PAUSE',
    'RESUME',
  ];
  return validActions.includes(type as GameActionType);
}

// Enhanced error handling for replay validation
function validateReplayInput(
  input: unknown
): input is { type: string; frame: number; payload?: unknown } {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    'frame' in input &&
    typeof (input as any).type === 'string' &&
    typeof (input as any).frame === 'number'
  );
}

// Comprehensive upfront validation for entire replay data
function validateReplayData(replayData: ReplayData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Basic structure validation
  if (!replayData || typeof replayData !== 'object') {
    errors.push('Invalid replay data structure');
    return { valid: false, errors };
  }

  if (!replayData.seed || typeof replayData.seed !== 'string') {
    errors.push('Missing or invalid seed');
  }

  if (!Array.isArray(replayData.inputs)) {
    errors.push('Invalid inputs array');
    return { valid: false, errors };
  }

  // Validate each input
  const invalidInputs: number[] = [];
  const invalidActionTypes: string[] = [];
  let lastFrame = -1;

  replayData.inputs.forEach((input, index) => {
    // Check input structure
    if (!validateReplayInput(input)) {
      invalidInputs.push(index);
      return;
    }

    // Check action type
    if (!isValidReplayAction(input.type)) {
      invalidActionTypes.push(input.type);
    }

    // Check frame ordering (inputs should be in chronological order)
    if (input.frame < lastFrame) {
      errors.push(
        `Input ${index} has frame ${input.frame} which is before previous frame ${lastFrame}`
      );
    }
    lastFrame = input.frame;

    // Check frame is non-negative
    if (input.frame < 0) {
      errors.push(`Input ${index} has negative frame ${input.frame}`);
    }
  });

  if (invalidInputs.length > 0) {
    errors.push(
      `${invalidInputs.length} inputs have invalid structure at indices: ${invalidInputs.slice(0, 5).join(', ')}${invalidInputs.length > 5 ? '...' : ''}`
    );
  }

  if (invalidActionTypes.length > 0) {
    const uniqueTypes = [...new Set(invalidActionTypes)];
    errors.push(`Invalid action types: ${uniqueTypes.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

export function useGameWithReplay(
  initialSeed?: string,
  defaultDebugMode = false,
  replayMode = false,
  replayData?: ReplayData
) {
  const [gameState, dispatchGame] = useReducer(
    gameReducerWithDebug,
    createInitialGameState(initialSeed, defaultDebugMode)
  );

  const {
    replayState,
    startRecording,
    stopRecording,
    recordInput,
    startPlayback,
    stopPlayback,
    getNextPlaybackInput,
    exportReplay,
  } = useReplay(gameState);

  const { saveReplay } = useSaveLoadReplay();

  // Track if we're currently processing a replay input to prevent recording it
  const processingReplayInput = useRef(false);

  // Track previous game status to detect game over transition
  const prevGameStatus = useRef(gameState.status);

  // Auto-stop recording and save replay when game over occurs
  useEffect(() => {
    if (
      prevGameStatus.current !== 'gameOver' &&
      gameState.status === 'gameOver'
    ) {
      // Only stop recording and save if we're currently recording (not in playback mode)
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

  // Error handling for replay issues
  const handleReplayError = useCallback(
    (error: string, action?: GameAction) => {
      console.error(`Replay error: ${error}`, action);
      if (replayState.isPlayback) {
        stopPlayback();
      }
    },
    [replayState.isPlayback, stopPlayback]
  );

  // Main dispatch function that handles recording, playback, and game logic
  const dispatch = useCallback(
    (action: GameAction) => {
      try {
        // Handle replay input injection for TICK actions during playback
        if (action.type === 'TICK' && replayState.isPlayback) {
          const replayInput = getNextPlaybackInput();

          if (replayInput) {
            // No validation needed here - all inputs were validated upfront
            // Mark that we're processing a replay input to prevent recording
            processingReplayInput.current = true;

            // Create properly typed replay action using original frame number
            const replayAction: GameAction = {
              type: replayInput.type as GameActionType, // Safe cast - validated upfront
              frame: replayInput.frame, // Use original frame, not current frame
              payload: replayInput.payload,
            };

            // Dispatch the replay input
            dispatchGame(replayAction);

            // Reset the flag
            processingReplayInput.current = false;
          }
        }

        // Record input if we're recording and not processing a replay input
        if (replayState.isRecording && !processingReplayInput.current) {
          recordInput(action);
        }

        // Always dispatch the original action to game reducer
        dispatchGame(action);
      } catch (error) {
        handleReplayError(
          `Dispatch error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          action
        );
      }
    },
    [
      replayState.isRecording,
      replayState.isPlayback,
      recordInput,
      getNextPlaybackInput,
      handleReplayError,
    ]
  );

  // Use the game loop with the unified dispatch function
  const gameLoop = useGameLoop(gameState, dispatch, {
    enabled: true,
    debugMode: gameState.debugMode,
  });

  // Start recording when a new game starts
  const startNewGame = useCallback(() => {
    startRecording();
    dispatch({ type: 'START_GAME', frame: 0 });
  }, [dispatch, startRecording]);

  // Start replay playback with comprehensive upfront validation
  const startReplayPlayback = useCallback(
    (replayData: ReplayData) => {
      try {
        // Comprehensive validation of entire replay data
        const validation = validateReplayData(replayData);

        if (!validation.valid) {
          throw new Error(
            `Replay validation failed:\n${validation.errors.join('\n')}`
          );
        }

        // All validation passed - start playback
        startPlayback(replayData);

        // Initialize game with replay seed
        dispatch({
          type: 'START_GAME',
          frame: 0,
          payload: { isPlayback: true, replayData },
        });
      } catch (error) {
        handleReplayError(
          `Failed to start replay: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [startPlayback, dispatch, handleReplayError]
  );

  // Auto-start replay playback when in replay mode, or start new game when not in replay mode
  useEffect(() => {
    if (gameState.status !== 'initial') {
      return;
    }

    if (replayMode && replayData) {
      startReplayPlayback(replayData);
    } else if (!replayMode) {
      // Auto-start new game when not in replay mode
      startNewGame();
    }
  }, [
    gameState.status,
    replayMode,
    replayData,
    startReplayPlayback,
    startNewGame,
  ]);

  return {
    gameState,
    replayState,
    gameLoop,
    dispatch,
    startNewGame,
    startReplayPlayback,
    exportReplay,
    stopRecording,
    stopPlayback,
  };
}
