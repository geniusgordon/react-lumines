import { useCallback, useRef, useEffect, useMemo, useState } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { validateReplayData, expandReplayData } from '@/utils/replayUtils';

import { TARGET_FPS, TIMER_CONFIG } from '../constants';

import { useGame, type UseGameActions } from './useGame';
import { useGameLoop, type UseGameLoopReturn } from './useGameLoop';

// Controller-specific actions for replay player
export interface ReplayControllerActions {
  seek: (frame: number) => void;
  stepFrames: (delta: number) => void;
  setSpeed: (speed: number) => void;
  togglePlayPause: () => void;
  restart: () => void;
}

// Return type for useReplayPlayer hook
export interface UseReplayPlayerReturn {
  gameState: GameState;
  actions: UseGameActions;
  gameLoop: UseGameLoopReturn;
  // Controller-specific data
  currentFrame: number;
  totalFrames: number;
  speed: number;
  isPlaying: boolean;
  controllerActions: ReplayControllerActions;
}

export function useReplayPlayer(
  replayData: ReplayData,
  initialSpeed: number = 1.0
): UseReplayPlayerReturn {
  const { gameState, actions, _dispatch } = useGame(replayData?.seed, false);
  const [speed, setSpeed] = useState(initialSpeed);
  const [isPlaying, setIsPlaying] = useState(false);
  const isSeekingRef = useRef<boolean>(false);

  const frameActions = useMemo(() => {
    return expandReplayData(replayData);
  }, [replayData]);

  const currentFrameRef = useRef<number>(0);
  const totalFrames = useMemo(() => {
    const duration =
      replayData.metadata?.duration ||
      TIMER_CONFIG.GAME_DURATION_SECONDS * 1000;

    return (duration * TARGET_FPS) / 1000;
  }, [replayData]);

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
    const frameData = frameActions[currentFrame];

    if (frameData) {
      for (const userAction of frameData.userActions) {
        _dispatch(userAction);
      }
    }

    _dispatch({ type: 'TICK' });

    currentFrameRef.current = currentFrame + 1;
  }, [_dispatch, gameState.status, frameActions]);

  const isGameStatusActive =
    gameState.status === 'playing' || gameState.status === 'countdown';

  const gameLoop = useGameLoop(dispatchFrameActions, {
    enabled: isGameStatusActive && isPlaying,
    debugMode: gameState.debugMode,
    speed,
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
    currentFrameRef.current = 0;
    _dispatch({
      type: 'RESTART',
      payload: replayData.seed,
    });
  }, [_dispatch, replayData.seed]);

  // Controller Actions
  const seek = useCallback(
    (targetFrame: number) => {
      isSeekingRef.current = true;

      const clampedFrame = Math.max(0, Math.min(totalFrames - 1, targetFrame));

      // Reset game to beginning
      _dispatch({
        type: 'RESTART',
        payload: replayData.seed,
      });
      _dispatch({ type: 'START_GAME' });
      _dispatch({ type: 'SKIP_COUNTDOWN' });

      // Fast-forward to target frame
      currentFrameRef.current = 0;

      // Process all frames up to target in a loop
      for (let frame = 0; frame < clampedFrame; frame++) {
        const frameData = frameActions[frame];

        if (frameData) {
          for (const userAction of frameData.userActions) {
            _dispatch(userAction);
          }
        }

        _dispatch({ type: 'TICK' });
      }

      currentFrameRef.current = clampedFrame;
      isSeekingRef.current = false;
    },
    [_dispatch, replayData.seed, frameActions, totalFrames]
  );

  const stepFrames = useCallback(
    (delta: number) => {
      const newFrame = currentFrameRef.current + delta;
      seek(newFrame);
    },
    [seek]
  );

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const controllerSetSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  const controllerRestart = useCallback(() => {
    restartReplay();
  }, [restartReplay]);

  // Auto-start replay when game state is initial
  useEffect(() => {
    if (isSeekingRef.current) {
      return;
    }

    if (gameState.status === 'initial') {
      startReplay(replayData);
      setIsPlaying(true);
    }
  }, [gameState.status, replayData, startReplay]);

  // Update playing state based on game status
  useEffect(() => {
    const shouldBePlaying =
      gameState.status === 'playing' || gameState.status === 'countdown';
    setIsPlaying(shouldBePlaying);
  }, [gameState.status]);

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

  // Controller actions object
  const controllerActions = useMemo<ReplayControllerActions>(
    () => ({
      seek,
      stepFrames,
      setSpeed: controllerSetSpeed,
      togglePlayPause,
      restart: controllerRestart,
    }),
    [seek, stepFrames, controllerSetSpeed, togglePlayPause, controllerRestart]
  );

  return {
    gameState,
    actions: replayActions,
    gameLoop,
    currentFrame: currentFrameRef.current,
    totalFrames,
    speed,
    isPlaying,
    controllerActions,
  };
}
