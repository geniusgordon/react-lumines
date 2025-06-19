import {
  GAME_CONFIG,
  DEFAULT_VALUES,
  TIME_ATTACK_CONFIG,
} from '@/constants/gameConfig';
import type { GameState, GameAction } from '@/types/game';
import { logDebugAction, logGameState } from '@/utils/debugLogger';
import {
  createEmptyBoard,
  generateRandomBlock,
  isValidPosition,
  placeBlockOnBoard,
  findDropPosition,
  detectRectangles,
  clearRectanglesAndApplyGravity,
  calculateScore,
  isGameOver,
  getRotatedPattern,
  applyGravity,
} from '@/utils/gameLogic';
import { SeededRNG } from '@/utils/seededRNG';

/**
 * Create initial game state
 */
export function createInitialGameState(
  seed: number = DEFAULT_VALUES.SEED,
  debugMode: boolean = false
): GameState {
  const rng = new SeededRNG(seed);
  const currentBlock = generateRandomBlock(rng);
  // Initialize queue with multiple blocks for preview
  const queue = [
    generateRandomBlock(rng),
    generateRandomBlock(rng),
    generateRandomBlock(rng),
  ];

  return {
    // Core game data
    board: createEmptyBoard(),
    currentBlock,
    queue,
    blockPosition: { ...DEFAULT_VALUES.INITIAL_POSITION },

    // Game flow
    status: 'start',
    score: 0,
    rectanglesCleared: 0,

    // Timing
    frame: 0,
    dropTimer: 0,
    dropInterval: TIME_ATTACK_CONFIG.FIXED_DROP_INTERVAL,

    // Timeline
    timeline: {
      x: 0,
      speed: GAME_CONFIG.timing.initialDropInterval,
      active: false,
      rectanglesCleared: 0,
    },

    // Deterministic system
    seed,
    rngState: rng.getState(),

    // Performance
    lastUpdateTime: 0,

    // Debug mode
    debugMode,
  };
}

/**
 * Handle block movement (left/right)
 */
function handleBlockMovement(
  state: GameState,
  action: GameAction,
  direction: 'left' | 'right'
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const offset = direction === 'left' ? -1 : 1;
  const newPosition = {
    x: state.blockPosition.x + offset,
    y: state.blockPosition.y,
  };

  if (
    isValidPosition(state.board, state.currentBlock, newPosition) === 'valid'
  ) {
    return {
      ...state,
      blockPosition: newPosition,
      frame: action.frame,
    };
  }

  return state;
}

/**
 * Handle block rotation (CW/CCW)
 */
function handleBlockRotation(
  state: GameState,
  action: GameAction,
  direction: 'cw' | 'ccw'
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const rotationOffset = direction === 'cw' ? 1 : -1;
  const newRotation = ((state.currentBlock.rotation + rotationOffset + 4) %
    4) as 0 | 1 | 2 | 3;

  if (
    isValidPosition(
      state.board,
      state.currentBlock,
      state.blockPosition,
      newRotation
    ) === 'valid'
  ) {
    return {
      ...state,
      currentBlock: {
        ...state.currentBlock,
        rotation: newRotation,
        pattern: getRotatedPattern(state.currentBlock, newRotation),
      },
      frame: action.frame,
    };
  }

  return state;
}

/**
 * Handle soft drop logic
 */
function handleSoftDrop(
  state: GameState,
  action: GameAction,
  rng: SeededRNG
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const softDropPosition = {
    x: state.blockPosition.x,
    y: state.blockPosition.y + 1,
  };

  if (
    isValidPosition(state.board, state.currentBlock, softDropPosition) ===
    'valid'
  ) {
    return {
      ...state,
      blockPosition: softDropPosition,
      dropTimer: 0, // Reset drop timer
      frame: action.frame,
    };
  }

  // If can't drop, place block
  return placeCurrentBlock(state, action.frame, rng);
}

/**
 * Handle hard drop logic
 */
function handleHardDrop(
  state: GameState,
  action: GameAction,
  rng: SeededRNG
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const dropPosition = findDropPosition(
    state.board,
    state.currentBlock,
    state.blockPosition
  );
  const newState = {
    ...state,
    blockPosition: dropPosition,
    frame: action.frame,
  };
  return placeCurrentBlock(newState, action.frame, rng);
}

/**
 * Handle game tick - separated into logical sub-functions
 */
function handleGameTick(
  state: GameState,
  action: GameAction,
  rng: SeededRNG
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  let newState = { ...state, frame: action.frame };

  // Handle block dropping
  newState = updateDropTimer(newState, action.frame, rng);

  // Handle timeline progression
  newState = updateTimeline(newState);

  return newState;
}

/**
 * Update drop timer and handle automatic block dropping
 */
function updateDropTimer(
  state: GameState,
  frame: number,
  rng: SeededRNG
): GameState {
  const newState = { ...state };
  newState.dropTimer++;

  // Check if block should drop
  if (newState.dropTimer >= newState.dropInterval) {
    const dropPos = {
      x: newState.blockPosition.x,
      y: newState.blockPosition.y + 1,
    };

    if (
      isValidPosition(newState.board, newState.currentBlock, dropPos) ===
      'valid'
    ) {
      newState.blockPosition = dropPos;
      newState.dropTimer = 0;
    } else {
      // Can't drop, place block
      logGameState(newState);
      const s = placeCurrentBlock(newState, frame, rng);
      logGameState(s);
      return s;
    }
  }

  return newState;
}

/**
 * Update timeline sweep progression
 */
function updateTimeline(state: GameState): GameState {
  if (!state.timeline.active) {
    return state;
  }

  const newTimeline = {
    ...state.timeline,
    x: state.timeline.x + state.timeline.speed,
  };

  // Check if timeline reached end
  if (newTimeline.x >= GAME_CONFIG.board.width) {
    newTimeline.active = false;
    newTimeline.x = 0;
  }

  return {
    ...state,
    timeline: newTimeline,
  };
}

/**
 * Handle rectangle clearing logic
 */
function handleClearRectangles(
  state: GameState,
  action: GameAction,
  rng: SeededRNG
): GameState {
  const rectangles = detectRectangles(state.board);
  if (rectangles.length === 0) {
    return state;
  }

  const { newBoard } = clearRectanglesAndApplyGravity(state.board, rectangles);
  const points = calculateScore(rectangles);

  return {
    ...state,
    board: newBoard,
    score: state.score + points,
    rectanglesCleared: state.rectanglesCleared + rectangles.length,
    timeline: { ...state.timeline, active: true }, // Start timeline sweep
    rngState: rng.getState(),
    frame: action.frame,
  };
}

/**
 * Main game state reducer
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  // Debug logging - log incoming action
  logDebugAction(state, action);

  // Create RNG instance with current state for deterministic operations
  const rng = new SeededRNG(state.seed);
  rng.setState(state.rngState);

  switch (action.type) {
    case 'START_GAME':
      return {
        ...createInitialGameState(state.seed),
        status: 'playing',
        frame: action.frame,
        debugMode: state.debugMode,
      };

    case 'PAUSE':
      return state.status === 'playing'
        ? { ...state, status: 'paused', frame: action.frame }
        : state;

    case 'RESUME':
      return state.status === 'paused'
        ? { ...state, status: 'playing', frame: action.frame }
        : state;

    case 'RESTART':
      return createInitialGameState(state.seed, state.debugMode);

    case 'SET_DEBUG_MODE': {
      const newDebugMode = action.payload as boolean;
      return {
        ...state,
        debugMode: newDebugMode,
        frame: action.frame,
      };
    }

    // Complex cases use extracted handlers
    case 'MOVE_LEFT':
      return handleBlockMovement(state, action, 'left');

    case 'MOVE_RIGHT':
      return handleBlockMovement(state, action, 'right');

    case 'ROTATE_CW':
      return handleBlockRotation(state, action, 'cw');

    case 'ROTATE_CCW':
      return handleBlockRotation(state, action, 'ccw');

    case 'SOFT_DROP':
      return handleSoftDrop(state, action, rng);

    case 'HARD_DROP':
      return handleHardDrop(state, action, rng);

    case 'APPLY_GRAVITY': {
      if (state.status !== 'playing') {
        return state;
      }

      const newBoard = applyGravity(state.board);
      return {
        ...state,
        board: newBoard,
        frame: action.frame,
      };
    }

    case 'TICK':
      return handleGameTick(state, action, rng);

    case 'CLEAR_RECTANGLES':
      return handleClearRectangles(state, action, rng);

    case 'GAME_OVER':
      return {
        ...state,
        status: 'gameOver',
        frame: action.frame,
      };

    default:
      if (state.debugMode) {
        console.warn(`🐛 Unknown action type: ${action.type}`, action);
      }
      return state;
  }
}

/**
 * Debug-aware wrapper for gameReducer that logs state changes
 */
export function gameReducerWithDebug(
  state: GameState,
  action: GameAction
): GameState {
  const newState = gameReducer(state, action);

  // Log the final state changes if debug mode is enabled
  if (state.debugMode) {
    logDebugAction(state, action, newState);
  }

  return newState;
}

/**
 * Place current block on board and spawn next block
 */
function placeCurrentBlock(
  state: GameState,
  frame: number,
  rng: SeededRNG
): GameState {
  // Place block on board
  const newBoard = placeBlockOnBoard(
    state.board,
    state.currentBlock,
    state.blockPosition
  );

  // Check for game over
  if (isGameOver(newBoard)) {
    return {
      ...state,
      board: newBoard,
      status: 'gameOver',
      frame,
    };
  }

  // Move first block from queue to current, add new block to end of queue
  const [nextBlock, ...remainingQueue] = state.queue;
  const newBlock = generateRandomBlock(rng);
  const newQueue = [...remainingQueue, newBlock];

  // Check for rectangles to clear
  const rectangles = detectRectangles(newBoard);
  let finalBoard = newBoard;
  let score = state.score;
  let rectanglesCleared = state.rectanglesCleared;
  let timelineActive = false;

  if (rectangles.length > 0) {
    const { newBoard: clearedBoard } = clearRectanglesAndApplyGravity(
      newBoard,
      rectangles
    );
    finalBoard = clearedBoard;
    score += calculateScore(rectangles);
    rectanglesCleared += rectangles.length;
    timelineActive = true;
  }

  return {
    ...state,
    board: finalBoard,
    currentBlock: nextBlock,
    queue: newQueue,
    blockPosition: { ...DEFAULT_VALUES.INITIAL_POSITION },
    score,
    rectanglesCleared,
    dropTimer: 0,
    dropInterval: TIME_ATTACK_CONFIG.FIXED_DROP_INTERVAL, // Keep constant speed
    timeline: {
      ...state.timeline,
      active: timelineActive,
    },
    rngState: rng.getState(),
    frame,
  };
}
