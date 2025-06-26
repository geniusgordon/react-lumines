import { useCallback, useState, useRef, useEffect } from 'react';

import { FRAME_INTERVAL_MS } from '@/constants/gameConfig';
import type { GameAction, GameActionType } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import { useGame } from './useGame';

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

// Frame-based action structure
interface FrameActions {
  frame: number;
  userActions: GameAction[];
  hasTick: boolean;
}

// Reverse compaction: expand compact replay data into frame-based structure
function expandReplayData(replayData: ReplayData): FrameActions[] {
  const frameActions: FrameActions[] = [];
  let currentFrame = 0;

  // Find the maximum frame number to know when to stop
  const maxFrame =
    replayData.inputs.length > 0
      ? Math.max(...replayData.inputs.map(input => input.frame))
      : 0;

  // Generate sequence of frame-based actions
  while (currentFrame <= maxFrame) {
    // Find all user inputs at this frame
    const inputsAtFrame = replayData.inputs.filter(
      input => input.frame === currentFrame
    );

    const userActions: GameAction[] = inputsAtFrame.map(input => ({
      type: input.type as any, // Type assertion needed for GameActionType
      payload: input.payload,
    }));

    // Every frame has a TICK action
    frameActions.push({
      frame: currentFrame,
      userActions,
      hasTick: true,
    });

    currentFrame++;
  }

  return frameActions;
}

// Legacy function for backward compatibility
function expandReplayDataLegacy(replayData: ReplayData): GameAction[] {
  const frameActions = expandReplayData(replayData);
  const expandedActions: GameAction[] = [];

  for (const frame of frameActions) {
    // Add user actions first
    expandedActions.push(...frame.userActions);
    // Then add TICK if present
    if (frame.hasTick) {
      expandedActions.push({ type: 'TICK' });
    }
  }

  return expandedActions;
}

// Replay control state interface
interface ReplayControlState {
  isPlaying: boolean;
  isPaused: boolean;
  totalActions: number;
  currentReplayData: ReplayData | null;
}

export function useReplayPlayer(replayData?: ReplayData) {
  const { gameState, actions, _dispatch } = useGame(replayData?.seed, false);

  // Replay control state
  const [replayControl, setReplayControl] = useState<ReplayControlState>({
    isPlaying: false,
    isPaused: false,
    totalActions: 0,
    currentReplayData: null,
  });

  // Timer reference for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const frameActionsRef = useRef<FrameActions[]>([]);
  const currentFrameRef = useRef<number>(0);

  // Error handling for replay issues
  const handleReplayError = useCallback(
    (error: string, action?: GameAction) => {
      console.error(`Replay error: ${error}`, action);
    },
    []
  );

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Dispatch all actions for current frame
  const dispatchFrameActions = useCallback(() => {
    const currentFrame = currentFrameRef.current;
    const frameActions = frameActionsRef.current;

    if (currentFrame >= frameActions.length) {
      // Replay finished
      setReplayControl(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
      }));
      return;
    }

    const frameData = frameActions[currentFrame];

    // Dispatch user actions immediately (they happen at frame start)
    for (const userAction of frameData.userActions) {
      _dispatch(userAction);
    }

    // Always dispatch TICK action last (maintains 60 FPS rhythm)
    if (frameData.hasTick) {
      _dispatch({ type: 'TICK' });
    }

    // Update frame number (no re-render needed)
    currentFrameRef.current = currentFrame + 1;

    // Schedule next frame by checking current state
    setReplayControl(prev => {
      if (prev.isPlaying && !prev.isPaused) {
        timerRef.current = setTimeout(() => {
          dispatchFrameActions();
        }, FRAME_INTERVAL_MS);
      }
      return prev; // No state change needed
    });
  }, [_dispatch]);

  // Start replay from beginning
  const startReplay = useCallback(
    (replayData: ReplayData) => {
      try {
        clearTimer();

        // Comprehensive validation of entire replay data
        const validation = validateReplayData(replayData);

        if (!validation.valid) {
          throw new Error(
            `Replay validation failed:\n${validation.errors.join('\n')}`
          );
        }

        // Initialize game with replay seed first
        _dispatch({
          type: 'START_GAME',
          payload: { isPlayback: true, replayData },
        });

        // Expand replay data into frame-based structure
        const frameActions = expandReplayData(replayData);
        frameActionsRef.current = frameActions;

        // Reset frame index
        currentFrameRef.current = 0;

        // Set replay control state and start timer
        setReplayControl(prev => {
          const newState = {
            ...prev,
            isPlaying: true,
            isPaused: false,
            totalActions: frameActions.length,
            currentReplayData: replayData,
          };

          // Start dispatching frame actions with proper timing
          timerRef.current = setTimeout(() => {
            dispatchFrameActions();
          }, FRAME_INTERVAL_MS);

          return newState;
        });
      } catch (error) {
        handleReplayError(
          `Failed to start replay: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [_dispatch, handleReplayError, clearTimer, dispatchFrameActions]
  );

  // Pause replay
  const pauseReplay = useCallback(() => {
    clearTimer();
    setReplayControl(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
  }, [clearTimer]);

  // Resume replay
  const resumeReplay = useCallback(() => {
    if (!replayControl.isPaused) {
      return;
    }

    setReplayControl(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));

    // Continue from current position
    timerRef.current = setTimeout(() => {
      dispatchFrameActions();
    }, FRAME_INTERVAL_MS);
  }, [replayControl.isPaused, dispatchFrameActions]);

  // Restart replay
  const restartReplay = useCallback(() => {
    if (!replayControl.currentReplayData) {
      return;
    }

    clearTimer();
    startReplay(replayControl.currentReplayData);
  }, [replayControl.currentReplayData, clearTimer, startReplay]);

  // Stop replay
  const stopReplay = useCallback(() => {
    clearTimer();
    setReplayControl({
      isPlaying: false,
      isPaused: false,
      totalActions: 0,
      currentReplayData: null,
    });
    frameActionsRef.current = [];
    currentFrameRef.current = 0;
  }, [clearTimer]);

  // Auto-start replay when game state is initial
  useEffect(() => {
    if (gameState.status === 'initial' && replayData) {
      startReplay(replayData);
    }
  }, [gameState.status, replayData, startReplay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    gameState,
    startReplay,
    pauseReplay,
    resumeReplay,
    restartReplay,
    stopReplay,
    replayControl,
    expandReplayData: expandReplayDataLegacy,
    startNewGame: actions.startNewGame,
    // Expose current progress for UI if needed
    getCurrentProgress: () => ({
      currentFrame: currentFrameRef.current,
      totalFrames: replayControl.totalActions,
      progress:
        replayControl.totalActions > 0
          ? currentFrameRef.current / replayControl.totalActions
          : 0,
    }),
  };
}
