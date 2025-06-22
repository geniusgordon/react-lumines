import type { GameConfig, ControlsConfig } from '@/types/game';

// Core game dimensions
export const BOARD_WIDTH = 16;
export const BOARD_HEIGHT = 10;
export const BLOCK_SIZE = 2;

// Timing constants (deterministic frame-based)
export const TARGET_FPS = 60;
export const FRAME_INTERVAL_MS = 1000 / TARGET_FPS; // 16.67ms per frame
export const INITIAL_DROP_INTERVAL = 48; // frames (0.8 seconds at 60 FPS)

// Timeline sweep speed
export const TIMELINE_SWEEP_INTERVAL = 10; // frames per column (deterministic like block drops)

// Control key mappings
export const DEFAULT_CONTROLS: ControlsConfig = {
  moveLeft: ['ArrowLeft', 'KeyA'],
  moveRight: ['ArrowRight', 'KeyD'],
  rotateCW: ['KeyX', 'ArrowUp'],
  rotateCCW: ['KeyZ', 'KeyQ'],
  softDrop: ['KeyS'],
  hardDrop: ['ArrowDown', 'Space'],
  pause: ['KeyP', 'Escape'],
  restart: ['KeyR'],
  debug: ['F1', 'KeyG'],
  stepFrame: ['Period', 'BracketRight'],
};

// Complete game configuration
export const GAME_CONFIG: GameConfig = {
  board: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
  },
  timing: {
    targetFPS: TARGET_FPS,
    frameInterval: FRAME_INTERVAL_MS,
    initialDropInterval: INITIAL_DROP_INTERVAL,
  },
  timeline: {
    speed: TIMELINE_SWEEP_INTERVAL,
  },
  controls: DEFAULT_CONTROLS,
};

// Block patterns (2x2 grids with different color combinations)
export const BLOCK_PATTERNS = [
  // All light
  [
    [1, 1],
    [1, 1],
  ],
  // All dark
  [
    [2, 2],
    [2, 2],
  ],
  // Mixed patterns
  [
    [1, 2],
    [1, 2],
  ], // Vertical split
  [
    [1, 1],
    [2, 2],
  ], // Horizontal split
  [
    [1, 2],
    [2, 1],
  ], // Diagonal
  [
    [2, 1],
    [1, 2],
  ], // Reverse diagonal
  [
    [1, 2],
    [1, 1],
  ], // L-shape variants
  [
    [2, 1],
    [2, 2],
  ],
  [
    [1, 1],
    [1, 2],
  ],
  [
    [2, 2],
    [2, 1],
  ],
];

// Time attack mode
export const TIME_ATTACK_CONFIG = {
  FIXED_DROP_INTERVAL: 48, // Constant drop speed (frames between drops)
  GAME_DURATION: 60000, // 1 minute in milliseconds (optional for timed mode)
};

// Default game state values
export const DEFAULT_VALUES = {
  SEED: 12345, // Default seed for testing
  SCORE: 0,
  INITIAL_POSITION: { x: 7, y: -2 }, // Center top of board, higher to avoid collision
  TIMELINE_START: {
    x: 0,
    speed: TIMELINE_SWEEP_INTERVAL,
    timer: 0,
    active: true,
  }, // Frame-based timing
};
