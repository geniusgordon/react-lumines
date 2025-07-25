// Game Types - Lumines Game Type Definitions

// Cell values
export type CellValue = 0 | 1 | 2; // 0 = empty, 1 = light, 2 = dark

// Game board representation
export type GameBoard = CellValue[][];

// Block pattern (2x2 grid)
export type BlockPattern = CellValue[][];

// Position coordinates (integer only for determinism)
export interface Position {
  x: number;
  y: number;
}

// Block representation
export interface Block {
  pattern: BlockPattern;
  id: string;
}

// Timeline sweep state
export interface Timeline {
  x: number; // Current horizontal column (0 to BOARD_WIDTH-1)
  sweepInterval: number; // Timeline sweep interval in frames per column
  timer: number; // Frames until next column movement
  active: boolean; // Whether timeline is currently sweeping
  holdingScore: number; // Accumulated points waiting to be cleared
}

// Square for clearing detection
export interface Square {
  x: number;
  y: number;
  color: CellValue;
}

// Falling cell representation
export interface FallingCell {
  id: string;
  y: number;
  color: CellValue;
}

export interface FallingColumn {
  x: number;
  cells: FallingCell[]; // Falling cells by column (0 to BOARD_WIDTH-1)
  timer: number;
}

// Game status states
export type GameStatus =
  | 'initial'
  | 'countdown'
  | 'countdownPaused'
  | 'playing'
  | 'paused'
  | 'gameOver';

// Game action types
export type GameActionType =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'ROTATE_CW'
  | 'ROTATE_CCW'
  | 'SOFT_DROP'
  | 'HARD_DROP'
  | 'TICK' // Game loop update
  | 'PAUSE'
  | 'RESUME'
  | 'RESTART'
  | 'START_GAME'
  | 'SET_DEBUG_MODE' // Toggle debug mode and logging
  | 'SKIP_COUNTDOWN' // Skip countdown and start game immediately
  | 'RESTORE_STATE'; // Restore game state from snapshot

// Game action structure
export interface GameAction {
  type: GameActionType;
  payload?: unknown; // Additional action data
}

// Complete game state
export interface GameState {
  id: string; // Unique identifier for this game session/replay

  // Core game data
  board: GameBoard;
  currentBlock: Block;
  queue: Block[];
  blockPosition: Position;

  // Game flow
  status: GameStatus;
  score: number;

  // Timer system
  countdown: number; // 3, 2, 1, 0 (0 means countdown finished)
  gameTimer: number; // frames remaining in game (60 seconds * 60 FPS = 3600 frames)

  // Pattern detection
  detectedPatterns: Square[]; // Currently detected 2x2 patterns
  markedCells: Square[]; // Individual cells marked for clearing

  // Timing (all integer frame counts)
  frame: number; // Current frame number
  dropTimer: number; // Frames until next drop
  dropInterval: number; // Frames between drops

  // Timeline sweep
  timeline: Timeline;

  // Falling cells
  fallingColumns: FallingColumn[];

  // Deterministic system
  seed: string;
  rngState: number; // Current RNG state

  // Performance tracking
  lastUpdateTime: number; // For frame rate consistency

  // Debug mode
  debugMode: boolean; // Enable debug logging and manual stepping
}

// Control mapping
export interface ControlsConfig {
  moveLeft: string[];
  moveRight: string[];
  rotateCW: string[];
  rotateCCW: string[];
  softDrop: string[];
  hardDrop: string[];
  pause: string[];
  restart: string[];
  debug: string[];
  stepFrame: string[];
}

// Game configuration
export interface GameConfig {
  board: {
    width: number;
    height: number;
  };
  timing: {
    targetFPS: number;
    frameInterval: number; // milliseconds per frame
    initialDropInterval: number; // frames between drops
  };
  timeline: {
    sweepInterval: number; // Timeline sweep interval in frames per column
  };
  controls: ControlsConfig;
}

// Utility types for validation
export type ValidMove = 'valid' | 'invalid' | 'collision' | 'out_of_bounds';
