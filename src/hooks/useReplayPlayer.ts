import { useCallback, useState } from 'react';

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

// Reverse compaction: expand compact replay data into full action sequence
function expandReplayData(replayData: ReplayData): GameAction[] {
  const expandedActions: GameAction[] = [];
  let currentFrame = 0;

  // Find the maximum frame number to know when to stop
  const maxFrame =
    replayData.inputs.length > 0
      ? Math.max(...replayData.inputs.map(input => input.frame))
      : 0;

  // Generate sequence of actions with TICK actions inserted
  while (currentFrame <= maxFrame) {
    // Check if there's a user input at this frame
    const inputAtFrame = replayData.inputs.find(
      input => input.frame === currentFrame
    );

    if (inputAtFrame) {
      // Add user input action first
      expandedActions.push({
        type: inputAtFrame.type as any, // Type assertion needed for GameActionType
        payload: inputAtFrame.payload,
      });
    }

    // Always add TICK action (except for the very last frame to avoid extra tick)
    if (currentFrame <= maxFrame) {
      expandedActions.push({
        type: 'TICK',
      });
    }

    currentFrame++;
  }

  return expandedActions;
}

export function useReplayPlayer(initialSeed?: string) {
  const { gameState, actions, _dispatch } = useGame(initialSeed, false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Error handling for replay issues
  const handleReplayError = useCallback(
    (error: string, action?: GameAction) => {
      console.error(`Replay error: ${error}`, action);
      setIsProcessing(false);
    },
    []
  );

  // Process replay data sequentially
  const processReplay = useCallback(
    (replayData: ReplayData) => {
      try {
        setIsProcessing(true);

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

        // Expand replay data into full action sequence
        const expandedActions = expandReplayData(replayData);

        // Process all actions in sequence
        for (const action of expandedActions) {
          _dispatch(action);
        }

        setIsProcessing(false);
      } catch (error) {
        handleReplayError(
          `Failed to process replay: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [_dispatch, handleReplayError]
  );

  return {
    gameState,
    processReplay,
    isProcessing,
    expandReplayData,
    startNewGame: actions.startNewGame,
  };
}
