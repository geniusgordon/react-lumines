import { useEffect, useCallback, useRef, useState } from 'react';

import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import type {
  GameState,
  GameAction,
  GameActionType,
  ReplayInput,
  ControlsConfig,
  GameStatus,
} from '@/types/game';

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
   * Whether to record all inputs for replay functionality
   */
  recording?: boolean;

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

  /**
   * How often to update UI with recorded inputs (default: every 5 inputs)
   * Set to 1 for immediate updates, higher for better performance
   */
  uiUpdateBatchSize?: number;
}

export interface UseControlsReturn {
  /**
   * Whether input recording is active
   */
  isRecording: boolean;

  /**
   * All recorded inputs (for replay system)
   * Note: May be slightly behind actual recordings for performance reasons
   */
  recordedInputs: ReplayInput[];

  /**
   * Get current recorded inputs count (always up-to-date)
   */
  recordedInputsCount: number;

  /**
   * Force refresh of recorded inputs UI
   */
  refreshRecordedInputs: () => void;

  /**
   * Start recording inputs
   */
  startRecording: () => void;

  /**
   * Stop recording inputs
   */
  stopRecording: () => void;

  /**
   * Clear all recorded inputs
   */
  clearRecording: () => void;

  /**
   * Currently pressed keys (for UI feedback)
   */
  pressedKeys: Set<string>;
}

/**
 * Controls hook for keyboard input handling and replay recording
 *
 * PERFORMANCE OPTIMIZATION:
 * Uses a hybrid approach with useRef + useState to avoid lag:
 * - useRef stores actual data (no re-renders on every input)
 * - useState triggers UI updates in batches or on demand
 * - recordedInputsCount provides real-time count without array updates
 */
export function useControls(
  gameState: GameState,
  dispatch: React.Dispatch<GameAction>,
  options: UseControlsOptions = {}
): UseControlsReturn {
  const {
    recording = false,
    controlsConfig = DEFAULT_CONTROLS,
    debugMode = false,
    enableKeyRepeat = false,
    keyRepeatDelay = 150,
    uiUpdateBatchSize = 5, // Update UI every 5 inputs by default
  } = options;

  // Recording state - hybrid approach
  const [isRecording, setIsRecording] = useState(recording);
  const recordedInputsRef = useRef<ReplayInput[]>([]); // Actual data storage
  const [recordedInputsUI, setRecordedInputsUI] = useState<ReplayInput[]>([]); // UI display copy
  const [recordedInputsCount, setRecordedInputsCount] = useState(0); // Always up-to-date count
  const uiUpdateCounter = useRef(0); // Track when to update UI

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

  // Force refresh of UI from ref data
  const refreshRecordedInputs = useCallback(() => {
    setRecordedInputsUI([...recordedInputsRef.current]);
  }, []);

  // Dispatch action and record if needed
  const dispatchAction = useCallback(
    (actionType: GameActionType, payload?: unknown) => {
      const action: GameAction = {
        type: actionType,
        frame: gameState.frame,
        payload,
      };

      // Record input for replay system
      if (isRecording) {
        const replayInput: ReplayInput = {
          type: actionType,
          frame: gameState.frame,
          payload,
        };

        // Always update the ref (no performance cost)
        recordedInputsRef.current.push(replayInput);

        // Always update count (minimal re-render cost)
        setRecordedInputsCount(recordedInputsRef.current.length);

        // Batch UI updates to avoid lag
        uiUpdateCounter.current++;
        if (uiUpdateCounter.current >= uiUpdateBatchSize) {
          setRecordedInputsUI([...recordedInputsRef.current]);
          uiUpdateCounter.current = 0;
        }
      }

      dispatch(action);
    },
    [gameState.frame, dispatch, isRecording, uiUpdateBatchSize]
  );

  // Handle key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.code;

      // Prevent default browser behavior for game keys
      const gameAction = keyToActionMap.current.get(key);
      if (gameAction) {
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
          dispatchAction('RESTART');
        }
        return;
      }

      // Handle pause action (available in all playing states)
      if (gameAction === 'PAUSE') {
        if (isPausableState(gameState.status)) {
          dispatchAction('PAUSE');
        } else if (isResumableState(gameState.status)) {
          dispatchAction('RESUME');
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
        dispatchAction(gameAction);

        // Set up key repeat if enabled
        if (enableKeyRepeat && !keyRepeatTimers.current.has(key)) {
          const timer = setTimeout(() => {
            const repeatTimer = setInterval(() => {
              if (
                pressedKeysRef.current.has(key) &&
                gameState.status === 'playing'
              ) {
                dispatchAction(gameAction);
              } else {
                clearInterval(repeatTimer);
              }
            }, keyRepeatDelay);

            keyRepeatTimers.current.set(key, repeatTimer);
          }, keyRepeatDelay);

          keyRepeatTimers.current.set(key, timer);
        }
      }
    },
    [
      gameState.status,
      debugMode,
      enableKeyRepeat,
      keyRepeatDelay,
      dispatchAction,
    ]
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

  // Recording control functions
  const startRecording = useCallback(() => {
    setIsRecording(true);
    recordedInputsRef.current = [];
    setRecordedInputsUI([]);
    setRecordedInputsCount(0);
    uiUpdateCounter.current = 0;
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    // Ensure UI is up-to-date when stopping
    refreshRecordedInputs();
  }, [refreshRecordedInputs]);

  const clearRecording = useCallback(() => {
    recordedInputsRef.current = [];
    setRecordedInputsUI([]);
    setRecordedInputsCount(0);
    uiUpdateCounter.current = 0;
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
    isRecording,
    recordedInputs: recordedInputsUI, // UI-optimized copy
    recordedInputsCount, // Always up-to-date count
    refreshRecordedInputs,
    startRecording,
    stopRecording,
    clearRecording,
    pressedKeys,
  };
}
