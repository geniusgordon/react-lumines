import { useEffect, useCallback, useRef, useState } from 'react';

import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import type {
  GameState,
  GameActionType,
  ControlsConfig,
  GameStatus,
} from '@/types/game';

import type { UseGameActions } from './useGame';

const isRestartableState = (status: GameStatus): boolean => {
  return (
    status === 'playing' ||
    status === 'paused' ||
    status === 'countdown' ||
    status === 'countdownPaused' ||
    status === 'gameOver'
  );
};

const isPausableState = (status: GameStatus): boolean => {
  return status === 'playing' || status === 'countdown';
};

const isResumableState = (status: GameStatus): boolean => {
  return status === 'paused' || status === 'countdownPaused';
};

export interface UseControlsOptions {
  /**
   * Custom control key mappings (optional)
   */
  controlsConfig?: ControlsConfig;

  /**
   * Whether to handle input in debug mode
   * In debug mode, most inputs are disabled except pause/debug controls
   */
  debugMode?: boolean;

  /**
   * Enable repeated key actions while held down
   */
  enableKeyRepeat?: boolean;

  /**
   * Repeat delay in milliseconds for held keys (default: 150ms)
   */
  keyRepeatDelay?: number;
}

export interface UseControlsReturn {
  /**
   * Currently pressed keys (for UI feedback)
   */
  pressedKeys: Set<string>;
}

/**
 * Controls hook for keyboard input handling
 */
export function useControls(
  gameState: GameState,
  actions: UseGameActions,
  options: UseControlsOptions = {}
): UseControlsReturn {
  const {
    controlsConfig = DEFAULT_CONTROLS,
    debugMode = false,
    enableKeyRepeat = false,
    keyRepeatDelay = 150,
  } = options;

  // Key state tracking
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const keyRepeatTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Map key codes to game actions
  const keyToActionMap = useRef<Map<string, GameActionType>>(new Map());

  // Build key mapping on mount or when controls change
  useEffect(() => {
    const newMap = new Map<string, GameActionType>();

    // Helper to add multiple keys for one action
    const addKeys = (keys: string[], action: GameActionType) => {
      keys.forEach(key => newMap.set(key, action));
    };

    addKeys(controlsConfig.moveLeft, 'MOVE_LEFT');
    addKeys(controlsConfig.moveRight, 'MOVE_RIGHT');
    addKeys(controlsConfig.rotateCW, 'ROTATE_CW');
    addKeys(controlsConfig.rotateCCW, 'ROTATE_CCW');
    addKeys(controlsConfig.softDrop, 'SOFT_DROP');
    addKeys(controlsConfig.hardDrop, 'HARD_DROP');
    addKeys(controlsConfig.pause, 'PAUSE');
    addKeys(controlsConfig.restart, 'RESTART');
    addKeys(controlsConfig.debug, 'SET_DEBUG_MODE');
    addKeys(controlsConfig.stepFrame, 'TICK');

    keyToActionMap.current = newMap;
  }, [controlsConfig]);

  // Action mapping
  const actionMap = useRef<Map<GameActionType, () => void>>(new Map());

  // Build action mapping
  useEffect(() => {
    const newMap = new Map<GameActionType, () => void>();
    newMap.set('MOVE_LEFT', actions.moveLeft);
    newMap.set('MOVE_RIGHT', actions.moveRight);
    newMap.set('ROTATE_CW', actions.rotateCW);
    newMap.set('ROTATE_CCW', actions.rotateCCW);
    newMap.set('SOFT_DROP', actions.softDrop);
    newMap.set('HARD_DROP', actions.hardDrop);
    newMap.set('PAUSE', actions.pause);
    newMap.set('RESTART', actions.restartGame);
    newMap.set('SET_DEBUG_MODE', () =>
      actions.setDebugMode(!gameState.debugMode)
    );
    newMap.set('TICK', actions.tick);

    actionMap.current = newMap;
  }, [actions, gameState.debugMode]);

  // Handle key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.code;

      // Check modifiers
      const isShift = event.shiftKey;
      const isCtrl = event.ctrlKey || event.metaKey;

      // Prevent default browser behavior for game keys (only when no modifiers)
      const gameAction = keyToActionMap.current.get(key);
      if (gameAction && !isShift && !isCtrl) {
        event.preventDefault();
      }

      // Skip if already pressed (prevent key repeat unless enabled)
      if (pressedKeysRef.current.has(key) && !enableKeyRepeat) {
        return;
      }

      // Update pressed keys tracking
      if (!pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.add(key);
        setPressedKeys(new Set(pressedKeysRef.current));
      }

      // Handle restart action (available in all restartable states)
      if (gameAction === 'RESTART') {
        if (isRestartableState(gameState.status)) {
          actions.restartGame();
        }
        return;
      }

      // Handle pause action (available in all playing states)
      if (gameAction === 'PAUSE') {
        if (isPausableState(gameState.status)) {
          actions.pause();
        } else if (isResumableState(gameState.status)) {
          actions.resume();
        }
        return;
      }

      // In debug mode, only allow pause and manual stepping
      if (debugMode && gameState.status === 'playing') {
        // Debug mode specific controls could go here
        // For now, regular game actions are disabled in debug mode
        // (manual stepping is handled by useGameLoop)
        return;
      }

      // Handle game actions only when playing
      if (gameState.status === 'playing' && gameAction) {
        const actionFn = actionMap.current.get(gameAction);
        if (actionFn) {
          actionFn();

          // Set up key repeat if enabled
          if (enableKeyRepeat && !keyRepeatTimers.current.has(key)) {
            const timer = setTimeout(() => {
              const repeatTimer = setInterval(() => {
                if (
                  pressedKeysRef.current.has(key) &&
                  gameState.status === 'playing'
                ) {
                  actionFn();
                } else {
                  clearInterval(repeatTimer);
                }
              }, keyRepeatDelay);

              keyRepeatTimers.current.set(key, repeatTimer);
            }, keyRepeatDelay);

            keyRepeatTimers.current.set(key, timer);
          }
        }
      }
    },
    [gameState.status, debugMode, enableKeyRepeat, keyRepeatDelay, actions]
  );

  // Handle key release
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.code;

    // Remove from pressed keys
    if (pressedKeysRef.current.has(key)) {
      pressedKeysRef.current.delete(key);
      setPressedKeys(new Set(pressedKeysRef.current));
    }

    // Clear key repeat timer
    if (keyRepeatTimers.current.has(key)) {
      const timer = keyRepeatTimers.current.get(key);
      if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
      }
      keyRepeatTimers.current.delete(key);
    }
  }, []);

  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const timers = keyRepeatTimers.current;

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      // Clean up all key repeat timers
      timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      timers.clear();
    };
  }, [handleKeyDown, handleKeyUp]);

  // Clean up timers when component unmounts
  useEffect(() => {
    const timers = keyRepeatTimers.current;
    return () => {
      timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      timers.clear();
    };
  }, []);

  return {
    pressedKeys,
  };
}
