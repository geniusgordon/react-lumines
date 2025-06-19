import {
  GAME_CONFIG,
  DEFAULT_VALUES,
  TIME_ATTACK_CONFIG,
} from '@/constants/gameConfig';
import type { GameState, GameAction } from '@/types/game';
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
 * Debug logging helper
 */
function logDebugAction(
  state: GameState,
  action: GameAction,
  newState?: GameState
) {
  if (!state.debugMode) {
    return;
  }

  const timestamp = new Date().toLocaleTimeString();
  const frameInfo = `Frame ${action.frame}`;

  console.group(`🐛 [${timestamp}] ${frameInfo} - ${action.type}`);

  // Log action details
  console.log('📥 Action:', action);

  // Log relevant state changes
  if (newState) {
    const stateChanges: Record<string, { from: any; to: any }> = {};

    // Track key state changes
    if (state.status !== newState.status) {
      stateChanges.status = { from: state.status, to: newState.status };
    }
    if (state.frame !== newState.frame) {
      stateChanges.frame = { from: state.frame, to: newState.frame };
    }
    if (state.score !== newState.score) {
      stateChanges.score = { from: state.score, to: newState.score };
    }
    if (
      state.blockPosition.x !== newState.blockPosition.x ||
      state.blockPosition.y !== newState.blockPosition.y
    ) {
      stateChanges.blockPosition = {
        from: { ...state.blockPosition },
        to: { ...newState.blockPosition },
      };
    }
    if (state.dropTimer !== newState.dropTimer) {
      stateChanges.dropTimer = {
        from: state.dropTimer,
        to: newState.dropTimer,
      };
    }

    if (Object.keys(stateChanges).length > 0) {
      console.log('📊 State Changes:', stateChanges);
    } else {
      console.log('📊 State: No changes');
    }
  } else {
    console.log('📊 State: Before processing');
  }

  console.groupEnd();
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

    case 'MOVE_LEFT': {
      if (state.status !== 'playing') return state;

      const leftPosition = {
        x: state.blockPosition.x - 1,
        y: state.blockPosition.y,
      };
      if (
        isValidPosition(state.board, state.currentBlock, leftPosition) ===
        'valid'
      ) {
        return {
          ...state,
          blockPosition: leftPosition,
          frame: action.frame,
        };
      }
      return state;
    }

    case 'MOVE_RIGHT': {
      if (state.status !== 'playing') return state;

      const rightPosition = {
        x: state.blockPosition.x + 1,
        y: state.blockPosition.y,
      };
      if (
        isValidPosition(state.board, state.currentBlock, rightPosition) ===
        'valid'
      ) {
        return {
          ...state,
          blockPosition: rightPosition,
          frame: action.frame,
        };
      }
      return state;
    }

    case 'ROTATE_CW': {
      if (state.status !== 'playing') return state;

      const cwRotation = ((state.currentBlock.rotation + 1) % 4) as
        | 0
        | 1
        | 2
        | 3;
      if (
        isValidPosition(
          state.board,
          state.currentBlock,
          state.blockPosition,
          cwRotation
        ) === 'valid'
      ) {
        return {
          ...state,
          currentBlock: {
            ...state.currentBlock,
            rotation: cwRotation,
            pattern: getRotatedPattern(state.currentBlock, cwRotation),
          },
          frame: action.frame,
        };
      }
      return state;
    }

    case 'ROTATE_CCW': {
      if (state.status !== 'playing') return state;

      const ccwRotation = ((state.currentBlock.rotation - 1 + 4) % 4) as
        | 0
        | 1
        | 2
        | 3;
      if (
        isValidPosition(
          state.board,
          state.currentBlock,
          state.blockPosition,
          ccwRotation
        ) === 'valid'
      ) {
        return {
          ...state,
          currentBlock: {
            ...state.currentBlock,
            rotation: ccwRotation,
            pattern: getRotatedPattern(state.currentBlock, ccwRotation),
          },
          frame: action.frame,
        };
      }
      return state;
    }

    case 'SOFT_DROP': {
      if (state.status !== 'playing') return state;

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

    case 'HARD_DROP': {
      if (state.status !== 'playing') return state;

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

    case 'APPLY_GRAVITY': {
      if (state.status !== 'playing') return state;

      const newBoard = applyGravity(state.board);
      return {
        ...state,
        board: newBoard,
        frame: action.frame,
      };
    }

    case 'TICK': {
      if (state.status !== 'playing') return state;

      let newState = { ...state, frame: action.frame };

      // Update drop timer
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
          newState = placeCurrentBlock(newState, action.frame, rng);
        }
      }

      // Update timeline if active
      if (newState.timeline.active) {
        newState.timeline = {
          ...newState.timeline,
          x: newState.timeline.x + newState.timeline.speed,
        };

        // Check if timeline reached end
        if (newState.timeline.x >= GAME_CONFIG.board.width) {
          newState.timeline.active = false;
          newState.timeline.x = 0;
        }
      }

      return newState;
    }

    case 'CLEAR_RECTANGLES': {
      const rectangles = detectRectangles(state.board);
      if (rectangles.length === 0) return state;

      const { newBoard } = clearRectanglesAndApplyGravity(
        state.board,
        rectangles
      );
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
