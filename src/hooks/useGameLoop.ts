import { useRef, useEffect, useCallback } from 'react';

import { FRAME_INTERVAL_MS } from '@/constants/gameConfig';
import type { GameState, GameAction } from '@/types/game';

export interface UseGameLoopOptions {
  enabled?: boolean; // Whether the game loop should run

  /**
   * Maximum frames to skip per animation frame (default: 5)
   *
   * SPIRAL OF DEATH PREVENTION:
   * Without this limit, performance hiccups can create a death spiral:
   * 1. Frame takes 200ms instead of 16.67ms (browser hiccup)
   * 2. Accumulator has 200ms of "debt" (12 frames behind)
   * 3. Game tries to run 12 updates in next frame
   * 4. 12 updates take 300ms to process
   * 5. Now accumulator has 300ms of debt (18 frames)
   * 6. Game tries to run 18 updates... gets worse and worse
   * 7. RESULT: Game becomes completely unplayable!
   *
   * maxFrameSkip acts as a circuit breaker:
   * - Normal: doesn't interfere (1-2 updates per frame)
   * - Stress: limits damage (max 5 updates per frame)
   * - Trade-off: Smooth gameplay > perfect timing during hiccups
   * - Result: Game stays playable even when things go wrong
   */
  maxFrameSkip?: number;

  /**
   * Enable manual frame stepping mode for debugging (default: false)
   *
   * When enabled:
   * - Automatic game loop is disabled
   * - Game only advances when manualStep() is called
   * - Perfect for debugging deterministic behavior
   * - Useful for testing specific game scenarios frame by frame
   */
  debugMode?: boolean;
}

export interface UseGameLoopReturn {
  isRunning: boolean;
  currentFPS: number;
  frameCount: number;

  /**
   * Manually advance frames (only available in debug mode)
   * Perfect for step-by-step debugging of game logic
   */
  manualStep: (steps?: number) => void;

  /**
   * Whether manual stepping mode is active
   */
  isDebugMode: boolean;
}

/**
 * Fixed timestep game loop hook for deterministic gameplay
 *
 * ARCHITECTURE DECISION: Hybrid requestAnimationFrame + Fixed Timestep
 *
 * Why not setTimeout alone?
 * - Timing drift accumulates inaccuracies over time
 * - Gets throttled when tab inactive (breaks determinism)
 * - Less efficient than RAF for animations
 *
 * Why not requestAnimationFrame alone?
 * - Variable framerate (60Hz vs 120Hz vs 144Hz monitors)
 * - Non-deterministic (same game produces different results)
 * - Breaks replay system compatibility
 *
 * Our Solution: RAF for efficient rendering + Fixed timestep for game logic
 * - Game logic always runs at exactly 60 FPS (deterministic)
 * - Rendering uses browser's optimized animation timing
 * - Works consistently across all refresh rates
 * - Essential for replay system accuracy
 */
export function useGameLoop(
  gameState: GameState,
  dispatch: React.Dispatch<GameAction>,
  options: UseGameLoopOptions = {}
): UseGameLoopReturn {
  const { enabled = true, maxFrameSkip = 5, debugMode = false } = options;

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
  // In debug mode, we don't auto-run the loop - only manual stepping
  const shouldRun =
    enabled &&
    (gameState.status === 'playing' || gameState.status === 'countdown') &&
    !debugMode;

  // Fixed timestep update function
  const gameUpdate = useCallback(() => {
    dispatch({
      type: 'TICK',
    });
  }, [dispatch]);

  // Manual frame stepping function for debug mode
  const manualStep = useCallback(
    (steps: number = 1) => {
      if (
        debugMode &&
        (gameState.status === 'playing' || gameState.status === 'countdown')
      ) {
        for (let i = 0; i < steps; i++) {
          dispatch({
            type: 'TICK',
          });
        }
      }
    },
    [debugMode, gameState.status, dispatch]
  );

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
      // Cap deltaTime to maxFrameSkip worth of frames to prevent huge debt accumulation
      // Example: If browser freezes for 2000ms, we only add ~83ms of debt (5 frames)
      accumulator.current += Math.min(
        deltaTime,
        FRAME_INTERVAL_MS * maxFrameSkip
      );

      // Fixed timestep updates with frame skip protection
      // Always run game logic at exactly 16.67ms intervals, regardless of display refresh rate
      let updatesThisFrame = 0;
      while (
        accumulator.current >= FRAME_INTERVAL_MS &&
        updatesThisFrame < maxFrameSkip
      ) {
        gameUpdate(); // EXACTLY 60 FPS game logic update
        accumulator.current -= FRAME_INTERVAL_MS; // "Pay back" 16.67ms of debt
        updatesThisFrame++; // Track updates to prevent spiral of death
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
    if (gameState.status === 'countdown' || gameState.status === 'playing') {
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
    manualStep,
    isDebugMode: debugMode,
  };
}
