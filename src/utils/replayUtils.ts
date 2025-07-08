import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameAction, GameActionType, GameState } from '@/types/game';
import type {
  ExpandedReplayData,
  FrameActions,
  ReplayData,
  ReplayInput,
  StateSnapshot,
} from '@/types/replay';

import { TARGET_FPS } from '../constants';

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
export function validateReplayData(replayData: ReplayData): {
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

// Reverse compaction: expand compact replay data into frame-based structure
export function expandReplayData(replayData: ReplayData): FrameActions[] {
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
    });

    currentFrame++;
  }

  return frameActions;
}

// Enhanced expansion: create both frame actions and snapshots upfront
export function expandReplayDataWithSnapshots(
  replayData: ReplayData
): ExpandedReplayData {
  const frameActions = expandReplayData(replayData);
  const snapshots = createSnapshotsForReplay(replayData.seed, frameActions);

  return {
    ...replayData,
    frameActions,
    snapshots,
  };
}

// Compact recorded actions: filter out TICKs and calculate frame numbers
export function compactReplayInputs(
  recordedInputs: ReplayInput[]
): ReplayInput[] {
  const compactInputs: ReplayInput[] = [];
  let currentFrame = 0;

  for (const action of recordedInputs) {
    if (action.type === 'TICK') {
      // TICK actions advance the frame counter
      currentFrame++;
    } else {
      // User input actions get recorded with current frame
      compactInputs.push({
        type: action.type,
        frame: currentFrame,
        payload: action.payload,
      });
    }
  }

  return compactInputs;
}

// Create replay data from recorded inputs and seed
export function createReplayData(
  recordedInputs: ReplayInput[],
  gameState: Pick<GameState, 'id' | 'seed' | 'score' | 'frame'>
): ReplayData {
  return {
    id: gameState.id,
    seed: gameState.seed,
    inputs: compactReplayInputs(recordedInputs),
    gameConfig: {
      version: '1.0.0',
      timestamp: Date.now(),
    },
    metadata: {
      finalScore: gameState.score,
      duration: Math.floor((gameState.frame / TARGET_FPS) * 1000),
    },
  };
}

// Constants for snapshot optimization
export const SNAPSHOT_INTERVAL = 100;

// Helper function to determine snapshot frames
export function getSnapshotFrames(maxFrame: number): number[] {
  const snapshotFrames: number[] = [];
  for (let frame = 0; frame <= maxFrame; frame += SNAPSHOT_INTERVAL) {
    snapshotFrames.push(frame);
  }
  return snapshotFrames;
}

// Find the best snapshot to use for seeking to a target frame
export function findBestSnapshot(
  snapshots: StateSnapshot[],
  targetFrame: number
): StateSnapshot | null {
  if (snapshots.length === 0) {
    return null;
  }

  // Find the latest snapshot that's before or at the target frame
  let bestSnapshot: StateSnapshot | null = null;
  for (const snapshot of snapshots) {
    if (snapshot.frame <= targetFrame) {
      if (!bestSnapshot || snapshot.frame > bestSnapshot.frame) {
        bestSnapshot = snapshot;
      }
    }
  }

  return bestSnapshot;
}

// Create all snapshots upfront by simulating the entire replay
export function createSnapshotsForReplay(
  seed: string,
  frameActions: FrameActions[]
): StateSnapshot[] {
  const snapshots: StateSnapshot[] = [];

  // Create initial game state with replay seed
  let gameState: GameState = createInitialGameState(seed, false);

  // Start the game and skip countdown
  gameState = gameReducer(gameState, { type: 'START_GAME' });
  gameState = gameReducer(gameState, { type: 'SKIP_COUNTDOWN' });

  // Create snapshot at frame 0 (initial state)
  snapshots.push({
    frame: 0,
    gameState: JSON.parse(JSON.stringify(gameState)), // Deep clone
  });

  // Simulate each frame and create snapshots at intervals
  for (let frameIndex = 0; frameIndex < frameActions.length; frameIndex++) {
    const frameData = frameActions[frameIndex];

    // Apply user actions for this frame
    for (const userAction of frameData.userActions) {
      gameState = gameReducer(gameState, userAction);
    }

    // Apply tick to advance game state
    gameState = gameReducer(gameState, { type: 'TICK' });

    // Create snapshot at regular intervals
    if ((frameIndex + 1) % SNAPSHOT_INTERVAL === 0) {
      snapshots.push({
        frame: frameIndex + 1,
        gameState: JSON.parse(JSON.stringify(gameState)), // Deep clone
      });
    }
  }

  return snapshots;
}
