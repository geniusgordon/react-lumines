import { useRef, useEffect, useCallback } from 'react';

import { FRAME_INTERVAL_MS } from '@/constants/gameConfig';
import type { GameState, GameAction } from '@/types/game';

export interface UseGameLoopOptions {
  enabled?: boolean; // Whether the game loop should run
  maxFrameSkip?: number; // Maximum frames to skip for performance
}

export interface UseGameLoopReturn {
  isRunning: boolean;
  currentFPS: number;
  frameCount: number;
}

/**
 * Fixed timestep game loop hook for deterministic gameplay
 * Maintains exactly 60 FPS with 16.67ms intervals
 */
export function useGameLoop(
  gameState: GameState,
  dispatch: React.Dispatch<GameAction>,
  options: UseGameLoopOptions = {}
): UseGameLoopReturn {
  const { enabled = true, maxFrameSkip = 5 } = options;

  // Refs for timing precision
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const accumulator = useRef<number>(0);
  const fpsTracker = useRef({
    frameCount: 0,
    lastFPSTime: 0,
    currentFPS: 0,
  });

  // Determine if game loop should be running
  const shouldRun = enabled && gameState.status === 'playing';

  // Fixed timestep update function
  const gameUpdate = useCallback(() => {
    const currentFrame = gameState.frame + 1;
    dispatch({
      type: 'TICK',
      frame: currentFrame,
    });
  }, [gameState.frame, dispatch]);

  // Main game loop with fixed timestep
  const gameLoop = useCallback(
    (currentTime: number) => {
      if (!shouldRun) {
        animationFrameId.current = null;
        return;
      }

      // Initialize timing on first run
      if (lastUpdateTime.current === 0) {
        lastUpdateTime.current = currentTime;
      }

      // Calculate delta time
      const deltaTime = currentTime - lastUpdateTime.current;
      lastUpdateTime.current = currentTime;

      // Add to accumulator (capped to prevent spiral of death)
      accumulator.current += Math.min(
        deltaTime,
        FRAME_INTERVAL_MS * maxFrameSkip
      );

      // Fixed timestep updates
      let updatesThisFrame = 0;
      while (
        accumulator.current >= FRAME_INTERVAL_MS &&
        updatesThisFrame < maxFrameSkip
      ) {
        gameUpdate();
        accumulator.current -= FRAME_INTERVAL_MS;
        updatesThisFrame++;
      }

      // FPS tracking
      fpsTracker.current.frameCount++;
      if (currentTime - fpsTracker.current.lastFPSTime >= 1000) {
        fpsTracker.current.currentFPS =
          (fpsTracker.current.frameCount * 1000) /
          (currentTime - fpsTracker.current.lastFPSTime);
        fpsTracker.current.frameCount = 0;
        fpsTracker.current.lastFPSTime = currentTime;
      }

      // Schedule next frame
      animationFrameId.current = requestAnimationFrame(gameLoop);
    },
    [shouldRun, gameUpdate, maxFrameSkip]
  );

  // Start/stop game loop based on game state
  useEffect(() => {
    if (shouldRun && !animationFrameId.current) {
      // Reset timing when starting
      lastUpdateTime.current = 0;
      accumulator.current = 0;
      animationFrameId.current = requestAnimationFrame(gameLoop);
    } else if (!shouldRun && animationFrameId.current) {
      // Stop the loop
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [shouldRun, gameLoop]);

  // Reset timing when game state changes dramatically
  useEffect(() => {
    if (gameState.status === 'start' || gameState.status === 'gameOver') {
      lastUpdateTime.current = 0;
      accumulator.current = 0;
      fpsTracker.current = {
        frameCount: 0,
        lastFPSTime: 0,
        currentFPS: 0,
      };
    }
  }, [gameState.status]);

  return {
    isRunning: shouldRun && animationFrameId.current !== null,
    currentFPS: Math.round(fpsTracker.current.currentFPS),
    frameCount: gameState.frame,
  };
}
