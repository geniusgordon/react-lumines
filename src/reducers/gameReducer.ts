import {
  GAME_CONFIG,
  DEFAULT_VALUES,
  TIMER_CONFIG,
  BOARD_HEIGHT,
} from '@/constants/gameConfig';
import type {
  GameState,
  GameAction,
  Square,
  FallingColumn,
  FallingCell,
} from '@/types/game';
import { logDebugAction } from '@/utils/debugLogger';
import {
  createEmptyBoard,
  generateRandomBlock,
  isValidPosition,
  placeBlockOnBoard,
  findDropPosition,
  getRotatedPattern,
  detectPatterns,
  getPatternsByLeftColumn,
  markColumnCells,
  clearMarkedCellsAndApplyGravity,
  canPlaceAnyPartOfBlock,
  createFallingColumns,
} from '@/utils/gameLogic';
import { SeededRNG, type SeededRNGType } from '@/utils/seededRNG';

/**
 * Create initial game state
 */
export function createInitialGameState(
  seed: string | undefined,
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
    status: 'initial',
    score: 0,

    // Timer system
    countdown: TIMER_CONFIG.COUNTDOWN_START,
    gameTimer: TIMER_CONFIG.GAME_DURATION_FRAMES,

    // Pattern detection
    detectedPatterns: [],

    // Timing
    frame: 0,
    dropTimer: 0,
    dropInterval: TIMER_CONFIG.FIXED_DROP_INTERVAL,

    // Timeline
    timeline: {
      x: 0,
      sweepInterval: GAME_CONFIG.timeline.sweepInterval,
      timer: 0,
      active: true,
      holdingScore: 0,
    },

    // Falling cells
    fallingColumns: [],

    // Pattern clearing
    markedCells: [],

    // Deterministic system
    seed: seed ?? Date.now().toString(),
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
  _action: GameAction,
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
    isValidPosition(
      state.board,
      state.currentBlock,
      newPosition,
      state.fallingColumns
    ) === 'valid'
  ) {
    return {
      ...state,
      blockPosition: newPosition,
    };
  }

  return state;
}

/**
 * Handle block rotation (CW/CCW)
 */
function handleBlockRotation(
  state: GameState,
  _action: GameAction,
  direction: 'cw' | 'ccw'
): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const rotationOffset = direction === 'cw' ? 1 : -1;
  const newRotation = ((state.currentBlock.rotation + rotationOffset + 4) %
    4) as 0 | 1 | 2 | 3;

  return {
    ...state,
    currentBlock: {
      ...state.currentBlock,
      rotation: newRotation,
      pattern: getRotatedPattern(state.currentBlock, newRotation),
    },
  };
}

/**
 * Handle soft drop logic
 */
function handleSoftDrop(state: GameState, rng: SeededRNGType): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const softDropPosition = {
    x: state.blockPosition.x,
    y: state.blockPosition.y + 1,
  };

  if (
    isValidPosition(
      state.board,
      state.currentBlock,
      softDropPosition,
      state.fallingColumns
    ) === 'valid'
  ) {
    return {
      ...state,
      blockPosition: softDropPosition,
      dropTimer: 0, // Reset drop timer
    };
  }

  // If can't drop, place block and apply gravity
  return placeBlockAndApplyPhysics(state, state.frame, rng);
}

/**
 * Handle hard drop logic
 */
function handleHardDrop(state: GameState, rng: SeededRNGType): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const dropPosition = findDropPosition(
    state.board,
    state.currentBlock,
    state.blockPosition,
    state.fallingColumns
  );
  const newState = {
    ...state,
    blockPosition: dropPosition,
  };
  return placeBlockAndApplyPhysics(newState, newState.frame, rng);
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
 * Handle countdown and timer logic
 */
function handleCountdownAndTimer(state: GameState): GameState {
  // Handle countdown state
  if (state.status === 'countdown') {
    // Simple countdown logic - every 60 frames decrements countdown
    const nextFrame = state.frame + 1;
    const countdownStep = Math.floor(
      nextFrame / TIMER_CONFIG.COUNTDOWN_DURATION
    );
    const newCountdown = TIMER_CONFIG.COUNTDOWN_START - countdownStep;

    if (newCountdown <= 0) {
      // Countdown finished, start playing
      return {
        ...state,
        status: 'playing',
        countdown: 0,
        frame: 0, // Reset frame counter to 0 when gameplay begins
      };
    } else {
      // Continue countdown
      return {
        ...state,
        countdown: newCountdown,
        frame: nextFrame,
      };
    }
  }

  // Handle game timer for playing state
  if (state.status === 'playing') {
    const newGameTimer = state.gameTimer - 1;

    // Check if time is up
    if (newGameTimer <= 0) {
      return {
        ...state,
        status: 'gameOver',
        gameTimer: 0,
        frame: state.frame + 1,
      };
    }

    return {
      ...state,
      gameTimer: newGameTimer,
      frame: state.frame + 1,
    };
  }

  return state;
}

/**
 * Handle game tick - main game loop logic
 */
function handleGameTick(state: GameState, rng: SeededRNGType): GameState {
  // First handle countdown and timer logic
  let newState = handleCountdownAndTimer(state);

  // Only process game logic if we're in playing state
  if (newState.status !== 'playing') {
    return newState;
  }

  // Handle block dropping and placement
  newState = handleBlockDrop(newState, newState.frame, rng);

  // Update pattern detection (only once per tick)
  newState = updatePatternDetection(newState);

  // Handle timeline progression and clearing
  newState = updateTimeline(newState, rng);

  // Update falling columns
  newState = updateFallingColumns(newState);

  return newState;
}

/**
 * Handle block dropping logic - either move down or place block
 */
function handleBlockDrop(
  state: GameState,
  frame: number,
  rng: SeededRNGType
): GameState {
  const newState = { ...state };
  newState.dropTimer++;

  // Check if block should drop
  if (newState.dropTimer >= newState.dropInterval) {
    const dropPosition = {
      x: newState.blockPosition.x,
      y: newState.blockPosition.y + 1,
    };

    // Try to move block down
    if (
      isValidPosition(
        newState.board,
        newState.currentBlock,
        dropPosition,
        newState.fallingColumns
      ) === 'valid'
    ) {
      // Block can drop normally
      newState.blockPosition = dropPosition;
      newState.dropTimer = 0;
      return newState;
    } else {
      // Can't drop, place block and apply physics
      return placeBlockAndApplyPhysics(newState, frame, rng);
    }
  }

  // Timer hasn't reached drop interval yet
  return newState;
}

/**
 * Place current block and apply all physics (gravity, spawning)
 */
function placeBlockAndApplyPhysics(
  state: GameState,
  frame: number,
  rng: SeededRNGType
): GameState {
  // Place the block on the board
  const placedState = placeCurrentBlock(state, frame, rng);

  const { newFallingColumns, newBoard } = createFallingColumns(
    placedState.board,
    placedState.fallingColumns,
    rng
  );

  // Apply gravity to settle all blocks
  const newState = {
    ...placedState,
    board: newBoard,
    fallingColumns: newFallingColumns,
  };

  return newState;
}

function updateFallingColumns(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const newBoard = state.board.map(row => [...row]);
  const newFallingColumns: FallingColumn[] = [];

  for (const column of state.fallingColumns) {
    const newTimer = column.timer + 1;
    const isTimerReached = newTimer >= TIMER_CONFIG.FALLING_CELL_INTERVAL;
    const updatedCells: FallingCell[] = [];

    // Process each cell in the column
    for (const cell of column.cells) {
      const nextY = cell.y + 1;

      if (nextY >= BOARD_HEIGHT || newBoard[nextY][column.x] !== 0) {
        newBoard[cell.y][column.x] = cell.color;
        continue;
      }

      updatedCells.push({
        id: cell.id,
        y: isTimerReached ? nextY : cell.y,
        color: cell.color,
      });
    }

    // Only keep columns that still have falling cells
    if (updatedCells.length > 0) {
      newFallingColumns.push({
        x: column.x,
        cells: updatedCells,
        timer: isTimerReached ? 0 : newTimer,
      });
    }
  }

  return {
    ...state,
    board: newBoard,
    fallingColumns: newFallingColumns,
  };
}

/**
 * Update timeline sweep progression with column-based clearing logic
 */
function updateTimeline(state: GameState, rng: SeededRNGType): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const newTimer = state.timeline.timer + 1;

  // Check if it's time to move timeline one column
  if (newTimer >= state.timeline.sweepInterval) {
    return advanceTimelineToNextColumn(state, rng);
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
 * Advance timeline to next column and process the current column
 */
function advanceTimelineToNextColumn(
  state: GameState,
  rng: SeededRNGType
): GameState {
  const currentColumn = state.timeline.x;
  const nextColumn = (currentColumn + 1) % GAME_CONFIG.board.width;

  // Process the current column before moving
  const processedState = processTimelineColumn(state, nextColumn, rng);

  return {
    ...processedState,
    timeline: {
      ...processedState.timeline,
      x: nextColumn,
      timer: 0, // Reset timer for next column
    },
  };
}

/**
 * Process a single column when timeline passes through it
 */
function processTimelineColumn(
  state: GameState,
  column: number,
  rng: SeededRNGType
): GameState {
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

  // Case 1: Mark cells for clearing if there are patterns
  if (hasPatternsInCurrentColumn || hasPatternsInPreviousColumn) {
    return markCellsForClearing(state, column, patternsInColumn);
  }

  // Case 2: Clear marked cells if no patterns and we have holding score
  const shouldClear =
    !hasPatternsInCurrentColumn &&
    !hasPatternsInPreviousColumn &&
    state.timeline.holdingScore > 0 &&
    state.markedCells.length > 0;

  if (shouldClear) {
    return clearMarkedCellsAndScore(state, rng);
  }

  return state;
}

/**
 * Mark cells for clearing and update holding score
 */
function markCellsForClearing(
  state: GameState,
  column: number,
  patternsInColumn: Square[]
): GameState {
  let newState = { ...state };

  // Add holding score for patterns in current column
  if (patternsInColumn.length > 0) {
    const holdingPoints = patternsInColumn.length;
    newState = {
      ...newState,
      timeline: {
        ...newState.timeline,
        holdingScore: state.timeline.holdingScore + holdingPoints,
      },
    };
  }

  // Mark cells in this column for clearing
  const newMarkedCells = markColumnCells(column, state.detectedPatterns);
  newState = {
    ...newState,
    markedCells: [...state.markedCells, ...newMarkedCells],
  };

  return newState;
}

/**
 * Clear marked cells and update score
 */
function clearMarkedCellsAndScore(
  state: GameState,
  rng: SeededRNGType
): GameState {
  const { newBoard, newFallingColumns } = clearMarkedCellsAndApplyGravity(
    state.board,
    state.markedCells,
    state.fallingColumns,
    rng
  );
  const detectedPatterns = detectPatterns(newBoard);

  return {
    ...state,
    board: newBoard,
    fallingColumns: newFallingColumns,
    detectedPatterns,
    score: state.score + state.timeline.holdingScore,
    timeline: {
      ...state.timeline,
      holdingScore: 0,
    },
    markedCells: [],
  };
}

/**
 * Main game state reducer
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  // Create RNG instance only when needed - most actions don't need RNG
  let rng: SeededRNGType | null = null;
  const getRNG = (): SeededRNGType => {
    if (!rng) {
      rng = new SeededRNG(state.seed);
      rng.setState(state.rngState);
    }
    return rng;
  };

  switch (action.type) {
    case 'START_GAME': {
      return {
        ...state,
        status: 'countdown',
      };
    }

    case 'PAUSE': {
      if (state.status === 'playing') {
        return { ...state, status: 'paused' };
      } else if (state.status === 'countdown') {
        return { ...state, status: 'countdownPaused' };
      }
      return state;
    }

    case 'RESUME': {
      if (state.status === 'paused') {
        return { ...state, status: 'playing' };
      } else if (state.status === 'countdownPaused') {
        return { ...state, status: 'countdown' };
      }
      return state;
    }

    case 'RESTART': {
      const seed = action.payload as string;
      return createInitialGameState(seed, state.debugMode);
    }

    case 'SKIP_COUNTDOWN': {
      if (state.status === 'countdown' || state.status === 'countdownPaused') {
        return {
          ...state,
          status: 'playing',
          countdown: 0,
        };
      }
      return state;
    }

    case 'SET_DEBUG_MODE': {
      const newDebugMode = action.payload as boolean;
      return {
        ...state,
        debugMode: newDebugMode,
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
      return handleSoftDrop(state, getRNG());

    case 'HARD_DROP':
      return handleHardDrop(state, getRNG());

    case 'TICK':
      return handleGameTick(state, getRNG());

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
 * Place current block on board and spawn next block with enhanced game over logic
 */
function placeCurrentBlock(
  state: GameState,
  frame: number,
  rng: SeededRNGType
): GameState {
  const canPlaceBlock = canPlaceAnyPartOfBlock(
    state.board,
    state.blockPosition
  );

  if (!canPlaceBlock) {
    return {
      ...state,
      status: 'gameOver',
      frame,
    };
  }

  const newBoard = placeBlockOnBoard(
    state.board,
    state.currentBlock,
    state.blockPosition
  );

  // Move first block from queue to current, add new block to end of queue
  const [nextBlock, ...remainingQueue] = state.queue;
  const newBlock = generateRandomBlock(rng);
  const newQueue = [...remainingQueue, newBlock];

  return {
    ...state,
    board: newBoard,
    currentBlock: nextBlock,
    queue: newQueue,
    blockPosition: { ...DEFAULT_VALUES.INITIAL_POSITION },
    dropTimer: 0,
    dropInterval: TIMER_CONFIG.FIXED_DROP_INTERVAL,
    rngState: rng.getState(),
    frame,
  };
}
