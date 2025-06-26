import { useCallback, useState, useRef, useEffect, useMemo } from 'react';

import type { GameAction, GameActionType } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import { useGame } from './useGame';
import { useReplayLoop } from './useReplayLoop';

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
    const currentFrame = currentFrameRef.current;
    const frameActions = frameActionsRef.current;

    if (currentFrame >= frameActions.length) {
      // Replay finished - useReplayLoop will handle stopping
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
  }, [_dispatch]);

  // Use replay loop hook for RAF timing
  const shouldRunReplay = replayControl.isPlaying && !replayControl.isPaused;
  const replayLoop = useReplayLoop(shouldRunReplay, dispatchFrameActions);

  // Start replay from beginning
  const startReplay = useCallback(
    (replayData: ReplayData) => {
      try {
        // Stop any existing replay loop
        replayLoop.stop();

        // Comprehensive validation of entire replay data
        const validation = validateReplayData(replayData);

        if (!validation.valid) {
          throw new Error(
            `Replay validation failed:\n${validation.errors.join('\n')}`
          );
        }

        // Initialize game with replay seed first
        _dispatch({ type: 'START_GAME' });

        // Expand replay data into frame-based structure
        const frameActions = expandReplayData(replayData);
        frameActionsRef.current = frameActions;

        // Reset frame index
        currentFrameRef.current = 0;

        // Set replay control state
        setReplayControl({
          isPlaying: true,
          isPaused: false,
          totalActions: frameActions.length,
          currentReplayData: replayData,
        });
      } catch (error) {
        handleReplayError(
          `Failed to start replay: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [_dispatch, handleReplayError, replayLoop]
  );

  // Pause replay
  const pauseReplay = useCallback(() => {
    // Dispatch PAUSE action to update game state
    _dispatch({ type: 'PAUSE' });

    setReplayControl(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
  }, [_dispatch]);

  // Resume replay
  const resumeReplay = useCallback(() => {
    if (!replayControl.isPaused) {
      return;
    }

    // Dispatch RESUME action to update game state
    _dispatch({ type: 'RESUME' });

    setReplayControl(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
  }, [replayControl.isPaused, _dispatch]);

  // Restart replay
  const restartReplay = useCallback(() => {
    if (!replayControl.currentReplayData) {
      return;
    }

    // Stop current replay loop
    replayLoop.stop();

    // Reset game state to initial before starting replay
    _dispatch({
      type: 'RESTART',
      payload: replayControl.currentReplayData.seed,
    });

    // Reset replay control state
    setReplayControl(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
    }));

    // Reset frame counters
    frameActionsRef.current = [];
    currentFrameRef.current = 0;

    // Start the replay from beginning
    startReplay(replayControl.currentReplayData);
  }, [replayControl.currentReplayData, replayLoop, startReplay, _dispatch]);

  // Stop replay
  const stopReplay = useCallback(() => {
    replayLoop.stop();
    setReplayControl({
      isPlaying: false,
      isPaused: false,
      totalActions: 0,
      currentReplayData: null,
    });
    frameActionsRef.current = [];
    currentFrameRef.current = 0;
  }, [replayLoop]);

  // Auto-start replay when game state is initial
  useEffect(() => {
    if (gameState.status === 'initial' && replayData) {
      startReplay(replayData);
    }
  }, [gameState.status, replayData, startReplay]);

  // Cleanup is handled by useReplayLoop

  // Create actions object similar to useGamePlayer pattern
  const replayActions = useMemo(
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
      // Replay-specific actions
      pause: pauseReplay,
      resume: resumeReplay,
      startReplay,
      stopReplay,
    }),
    [
      actions.startNewGame,
      actions.setDebugMode,
      restartReplay,
      pauseReplay,
      resumeReplay,
      startReplay,
      stopReplay,
    ]
  );

  return {
    gameState,
    actions: replayActions,
    replayControl,
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
