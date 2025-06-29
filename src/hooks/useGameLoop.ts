import { useRef, useEffect, useCallback } from 'react';

import { FRAME_INTERVAL_MS } from '@/constants/gameConfig';

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

  /**
   * Speed multiplier for game loop (default: 1.0)
   *
   * Controls how fast the game runs:
   * - 1.0 = normal speed (60 FPS, 16.67ms intervals)
   * - 2.0 = 2x faster (120 FPS equivalent, 8.33ms intervals)
   * - 0.5 = 2x slower (30 FPS equivalent, 33.33ms intervals)
   *
   * Maintains deterministic behavior - same seed produces same results
   * regardless of speed setting.
   */
  speed?: number;
}

export interface UseGameLoopReturn {
  isRunning: boolean;
  currentFPS: number;

  /**
   * Manually advance frames (only available in debug mode)
   * Perfect for step-by-step debugging of game logic
   */
  manualStep: (steps?: number) => void;
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
  onFrame: () => void,
  options: UseGameLoopOptions = {}
): UseGameLoopReturn {
  const {
    enabled = true,
    maxFrameSkip = 5,
    debugMode = false,
    speed = 1.0,
  } = options;

  // Calculate dynamic frame interval based on speed
  const frameInterval = FRAME_INTERVAL_MS / speed;

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
  const shouldRun = enabled && !debugMode;

  // Store current shouldRun state to avoid closure issues
  const shouldRunRef = useRef<boolean>(shouldRun);

  // Update ref when shouldRun changes
  useEffect(() => {
    shouldRunRef.current = shouldRun;
  }, [shouldRun]);

  // Store onFrame ref to avoid stale closures
  const onFrameRef = useRef<() => void>(onFrame);

  // Update ref when onFrame changes
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  // Manual frame stepping function for debug mode
  const manualStep = useCallback(
    (steps: number = 1) => {
      if (debugMode) {
        for (let i = 0; i < steps; i++) {
          onFrameRef.current();
        }
      }
    },
    [debugMode]
  );

  // Main game loop with fixed timestep
  const gameLoop = useCallback(
    (currentTime: number) => {
      if (!shouldRunRef.current) {
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
      accumulator.current += Math.min(deltaTime, frameInterval * maxFrameSkip);

      // Fixed timestep updates with frame skip protection
      // Always run game logic at speed-adjusted intervals, regardless of display refresh rate
      let updatesThisFrame = 0;
      while (
        accumulator.current >= frameInterval &&
        updatesThisFrame < maxFrameSkip
      ) {
        onFrameRef.current(); // Speed-adjusted game logic update
        accumulator.current -= frameInterval; // "Pay back" frame interval of debt
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
    [maxFrameSkip, frameInterval]
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

  return {
    isRunning: shouldRun && animationFrameId.current !== null,
    currentFPS: Math.round(fpsTracker.current.currentFPS),
    manualStep,
  };
}
