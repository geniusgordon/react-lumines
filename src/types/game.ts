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

// Block rotation states
export type Rotation = 0 | 1 | 2 | 3;

// Block representation
export interface Block {
  pattern: BlockPattern;
  rotation: Rotation;
  id: string;
}

// Timeline sweep state
export interface Timeline {
  x: number; // Current horizontal position (0 to BOARD_WIDTH-1)
  speed: number; // Pixels per frame
  active: boolean; // Whether timeline is currently sweeping
  rectanglesCleared: number; // Number of rectangles cleared
}

// Rectangle for clearing detection
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: CellValue;
}

// Game status states
export type GameStatus = 'start' | 'playing' | 'paused' | 'gameOver' | 'replay';

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
  | 'GAME_OVER'
  | 'CLEAR_RECTANGLES'
  | 'APPLY_GRAVITY'
  | 'SET_DEBUG_MODE'; // Toggle debug mode and logging

// Game action structure
export interface GameAction {
  type: GameActionType;
  frame: number; // Frame when action occurred (for determinism)
  payload?: unknown; // Additional action data
}

// Complete game state
export interface GameState {
  // Core game data
  board: GameBoard;
  currentBlock: Block;
  queue: Block[];
  blockPosition: Position;

  // Game flow
  status: GameStatus;
  score: number;
  rectanglesCleared: number;

  // Timing (all integer frame counts)
  frame: number; // Current frame number
  dropTimer: number; // Frames until next drop
  dropInterval: number; // Frames between drops

  // Timeline sweep
  timeline: Timeline;

  // Deterministic system
  seed: number;
  rngState: number; // Current RNG state

  // Performance tracking
  lastUpdateTime: number; // For frame rate consistency

  // Debug mode
  debugMode: boolean; // Enable debug logging and manual stepping
}

// Replay system types
export interface ReplayInput {
  type: GameActionType;
  frame: number;
  payload?: unknown;
}

export interface ReplayCheckpoint {
  frame: number;
  state: GameState;
}

export interface ReplayData {
  version: string;
  seed: number;
  inputs: ReplayInput[];
  checkpoints: ReplayCheckpoint[];
  finalScore: number;
  duration: number; // Total frames
  metadata?: {
    playerName?: string;
    timestamp?: string;
    gameVersion?: string;
  };
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
  controls: ControlsConfig;
}

// Utility types for validation
export type ValidMove = 'valid' | 'invalid' | 'collision' | 'out_of_bounds';

// Hook return types
export interface UseGameLoopReturn {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  isRunning: boolean;
  fps: number;
}

export interface UseControlsReturn {
  isRecording: boolean;
  recordedInputs: ReplayInput[];
  startRecording: () => void;
  stopRecording: () => void;
  clearRecording: () => void;
}

export interface UseSeededRNGReturn {
  next: () => number;
  nextInt: (max: number) => number;
  nextFloat: () => number;
  reset: (seed?: number) => void;
  getSeed: () => number;
  getState: () => number;
}

// Error types
export class GameError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

export class ReplayError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ReplayError';
    this.code = code;
  }
}
