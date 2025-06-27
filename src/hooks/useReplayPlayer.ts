import { useCallback, useState, useRef, useEffect, useMemo } from 'react';

import type { GameAction } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import {
  validateReplayData,
  expandReplayData,
  type FrameActions,
} from '@/utils/replayUtils';

import { useGame } from './useGame';
import { useReplayLoop } from './useReplayLoop';

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
    if (gameState.status === 'countdown') {
      _dispatch({ type: 'TICK' });
      return;
    }

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
  }, [_dispatch, gameState.status]);

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
      skipCountdown: () => {},
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
