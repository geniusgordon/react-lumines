import { useRef, useEffect, useCallback } from 'react';

import { FRAME_INTERVAL_MS } from '@/constants/gameConfig';

export interface UseReplayLoopOptions {
  enabled?: boolean; // Whether the replay loop should run
}

export interface UseReplayLoopReturn {
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * RAF-based replay loop hook for deterministic replay timing
 *
 * ARCHITECTURE DECISION: Consistent with useGameLoop
 * - Uses requestAnimationFrame for browser-optimized timing
 * - Fixed timestep (60 FPS) for deterministic replay
 * - Proper cleanup and state management
 * - Separation of timing concerns from replay logic
 */
export function useReplayLoop(
  shouldRun: boolean,
  onFrame: () => void,
  options: UseReplayLoopOptions = {}
): UseReplayLoopReturn {
  const { enabled = true } = options;

  // RAF timing references for cleanup and fixed timestep
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const accumulator = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  // Clear RAF helper
  const clearRAF = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    isRunningRef.current = false;
  }, []);

  // RAF-based replay loop with fixed timestep
  const replayLoop = useCallback(
    (currentTime: number) => {
      // Check if replay should continue
      if (!shouldRun || !isRunningRef.current) {
        clearRAF();
        return;
      }

      // Initialize timing on first run
      if (lastUpdateTime.current === 0) {
        lastUpdateTime.current = currentTime;
      }

      // Calculate delta time
      const deltaTime = currentTime - lastUpdateTime.current;
      lastUpdateTime.current = currentTime;

      // Add to accumulator (maintain fixed timestep)
      accumulator.current += deltaTime;

      // Fixed timestep updates - exactly 60 FPS for deterministic replay
      while (accumulator.current >= FRAME_INTERVAL_MS) {
        onFrame();
        accumulator.current -= FRAME_INTERVAL_MS;

        // Check if we should continue after frame callback
        if (!shouldRun || !isRunningRef.current) {
          clearRAF();
          return;
        }
      }

      // Schedule next frame
      animationFrameId.current = requestAnimationFrame(replayLoop);
    },
    [shouldRun, onFrame, clearRAF]
  );

  // Start the replay loop
  const start = useCallback(() => {
    if (!enabled || isRunningRef.current) {
      return;
    }

    // Reset timing state
    lastUpdateTime.current = 0;
    accumulator.current = 0;
    isRunningRef.current = true;

    // Start RAF loop
    animationFrameId.current = requestAnimationFrame(replayLoop);
  }, [enabled, replayLoop]);

  // Stop the replay loop
  const stop = useCallback(() => {
    clearRAF();
  }, [clearRAF]);

  // Pause the replay loop
  const pause = useCallback(() => {
    clearRAF();
  }, [clearRAF]);

  // Resume the replay loop
  const resume = useCallback(() => {
    if (!enabled || isRunningRef.current) {
      return;
    }

    // Reset timing and resume
    lastUpdateTime.current = 0;
    isRunningRef.current = true;
    animationFrameId.current = requestAnimationFrame(replayLoop);
  }, [enabled, replayLoop]);

  // Auto-start when shouldRun becomes true
  useEffect(() => {
    if (shouldRun && enabled && !isRunningRef.current) {
      start();
    } else if (!shouldRun && isRunningRef.current) {
      stop();
    }
  }, [shouldRun, enabled, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRAF();
    };
  }, [clearRAF]);

  return {
    isRunning: isRunningRef.current && animationFrameId.current !== null,
    start,
    stop,
    pause,
    resume,
  };
}
