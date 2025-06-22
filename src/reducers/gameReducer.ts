import {
  GAME_CONFIG,
  DEFAULT_VALUES,
  TIME_ATTACK_CONFIG,
} from '@/constants/gameConfig';
import type { GameState, GameAction } from '@/types/game';
import { logDebugAction } from '@/utils/debugLogger';
import {
  createEmptyBoard,
  generateRandomBlock,
  isValidPosition,
  placeBlockOnBoard,
  findDropPosition,
  isGameOver,
  getRotatedPattern,
  applyGravity,
  detectPatterns,
  getPatternsByLeftColumn,
  markColumnCells,
  clearMarkedCellsAndApplyGravity,
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

    // Pattern detection
    detectedPatterns: [],
    markedPatterns: [],

    // Timing
    frame: 0,
    dropTimer: 0,
    dropInterval: TIME_ATTACK_CONFIG.FIXED_DROP_INTERVAL,

    // Timeline
    timeline: {
      x: 0,
      speed: GAME_CONFIG.timeline.speed,
      timer: 0,
      active: true,
      holdingScore: 0,
      markedCells: [],
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
  const placedState = placeCurrentBlock(newState, action.frame, rng);

  const gravityAppliedState = {
    ...placedState,
    board: applyGravity(placedState.board),
  };

  return gravityAppliedState;
}

/**
 * Update pattern detection
 */
function updatePatternDetection(state: GameState): GameState {
  // Detect all current 2x2 patterns on the board
  const detectedPatterns = detectPatterns(state.board);

  return {
    ...state,
    detectedPatterns,
  };
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
  const updateDropTimerResult = updateDropTimer(newState, action.frame, rng);
  newState = updateDropTimerResult.state;
  const blockPlaced = updateDropTimerResult.blockPlaced;

  if (blockPlaced) {
    newState.board = applyGravity(newState.board);
    newState = updatePatternDetection(newState);
  }

  // Handle pattern detection
  newState = updatePatternDetection(newState);

  // Handle timeline progression
  newState = updateTimeline(newState);

  return newState;
}

/**
 * Update drop timer and handle automatic block dropping
 * Returns both the new state and whether a block was placed
 */
function updateDropTimer(
  state: GameState,
  frame: number,
  rng: SeededRNG
): { state: GameState; blockPlaced: boolean } {
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
      // Block can drop normally
      newState.blockPosition = dropPos;
      newState.dropTimer = 0;
      return { state: newState, blockPlaced: false };
    } else {
      // Can't drop, place block
      const placedState = placeCurrentBlock(newState, frame, rng);
      return { state: placedState, blockPlaced: true };
    }
  }

  // Timer hasn't reached drop interval yet
  return { state: newState, blockPlaced: false };
}

/**
 * Update timeline sweep progression with column-based clearing logic
 */
function updateTimeline(state: GameState): GameState {
  // Timeline always moves when game is playing
  if (state.status !== 'playing') {
    return state;
  }

  const newTimer = state.timeline.timer + 1;

  // Check if it's time to move timeline one column
  if (newTimer >= state.timeline.speed) {
    const currentColumn = state.timeline.x;
    const nextColumn = (currentColumn + 1) % GAME_CONFIG.board.width;

    const newState = { ...state };

    // Process the current column before moving
    const processedState = processTimelineColumn(newState, currentColumn);

    return {
      ...processedState,
      timeline: {
        ...processedState.timeline,
        x: nextColumn,
        timer: 0, // Reset timer for next column
      },
    };
  }

  // Just increment timer
  return {
    ...state,
    timeline: {
      ...state.timeline,
      timer: newTimer,
    },
  };
}

/**
 * Process a single column when timeline passes through it
 */
function processTimelineColumn(state: GameState, column: number): GameState {
  const patternsInColumn = getPatternsByLeftColumn(
    state.detectedPatterns,
    column
  );
  const patternsInPreviousColumn = getPatternsByLeftColumn(
    state.detectedPatterns,
    column - 1
  );
  const hasPatternsInCurrentColumn = patternsInColumn.length > 0;
  const hasPatternsInPreviousColumn = patternsInPreviousColumn.length > 0;

  // Check if there are patterns in current or previous column to mark cells for clearing
  if (hasPatternsInCurrentColumn || hasPatternsInPreviousColumn) {
    let newState = { ...state };

    // Only add holding score for patterns in current column
    if (hasPatternsInCurrentColumn) {
      const holdingPoints = patternsInColumn.length;
      newState = {
        ...newState,
        timeline: {
          ...newState.timeline,
          holdingScore: state.timeline.holdingScore + holdingPoints,
        },
      };
    }

    const newMarkedCells = markColumnCells(column, state.detectedPatterns);
    newState = {
      ...newState,
      timeline: {
        ...newState.timeline,
        markedCells: [...state.timeline.markedCells, ...newMarkedCells],
      },
    };

    return newState;
  }

  // If no patterns in current AND previous column AND there's holding score, clear
  const noPatterns =
    !hasPatternsInCurrentColumn && !hasPatternsInPreviousColumn;
  const hasHoldingScore = state.timeline.holdingScore > 0;
  const hasMarkedCells = state.timeline.markedCells.length > 0;

  if (noPatterns && hasHoldingScore && hasMarkedCells) {
    const newBoard = clearMarkedCellsAndApplyGravity(
      state.board,
      state.timeline.markedCells
    );
    const detectedPatterns = detectPatterns(newBoard);

    return {
      ...state,
      board: newBoard,
      detectedPatterns,
      score: state.score + state.timeline.holdingScore,
      timeline: {
        ...state.timeline,
        holdingScore: 0,
        markedCells: [],
      },
    };
  }

  return state;
}

/**
 * Main game state reducer
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  // Debug logging - log incoming action
  logDebugAction(state, action);

  // Create RNG instance only when needed - most actions don't need RNG
  let rng: SeededRNG | null = null;
  const getRNG = (): SeededRNG => {
    if (!rng) {
      rng = new SeededRNG(state.seed);
      rng.setState(state.rngState);
    }
    return rng;
  };

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
      return handleSoftDrop(state, action, getRNG());

    case 'HARD_DROP':
      return handleHardDrop(state, action, getRNG());

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
      return handleGameTick(state, action, getRNG());

    case 'CLEAR_SQUARES':
      // TODO: Implement square clearing logic
      return state;

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

  // TODO: Implement square clearing logic

  return {
    ...state,
    board: newBoard,
    currentBlock: nextBlock,
    queue: newQueue,
    blockPosition: { ...DEFAULT_VALUES.INITIAL_POSITION },
    dropTimer: 0,
    dropInterval: TIME_ATTACK_CONFIG.FIXED_DROP_INTERVAL, // Keep constant speed
    rngState: rng.getState(),
    frame,
  };
}
