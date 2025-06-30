import type { GameConfig, ControlsConfig } from '@/types/game';

// Core game dimensions
export const BOARD_WIDTH = 16;
export const BOARD_HEIGHT = 10;
export const BLOCK_SIZE = 32;

// Timing constants (deterministic frame-based)
export const TARGET_FPS = 60;
export const FRAME_INTERVAL_MS = 1000 / TARGET_FPS; // 16.67ms per frame

// Timer constants
export const TIMER_CONFIG = {
  FIXED_DROP_INTERVAL: 90, // Constant drop speed (frames between drops)
  COUNTDOWN_START: 3, // Start countdown from 3
  COUNTDOWN_DURATION: 30, // 30 frames per countdown
  GAME_DURATION_FRAMES: 60 * TARGET_FPS, // 60 seconds * 60 FPS = 3600 frames
  GAME_DURATION_SECONDS: 60, // 60 seconds total game time
  TIMELINE_SWEEP_INTERVAL: (60 * TARGET_FPS) / 15 / BOARD_WIDTH, // Timeline frames per column (15 rounds for 60 seconds)
  FALLING_CELL_INTERVAL: 1, // Falling cell interval (frames between falling cells)
};

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
    initialDropInterval: TIMER_CONFIG.FIXED_DROP_INTERVAL,
  },
  timeline: {
    sweepInterval: TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL,
  },
  controls: DEFAULT_CONTROLS,
};

// Block patterns (2x2 grids with all 16 possible color combinations)
export const BLOCK_PATTERNS = [
  // Pattern 0: 0000 (binary) - All light
  [
    [1, 1],
    [1, 1],
  ],
  // Pattern 1: 0001 (binary)
  [
    [1, 1],
    [1, 2],
  ],
  // Pattern 2: 0010 (binary)
  [
    [1, 1],
    [2, 1],
  ],
  // Pattern 3: 0011 (binary)
  [
    [1, 1],
    [2, 2],
  ],
  // Pattern 4: 0100 (binary)
  [
    [1, 2],
    [1, 1],
  ],
  // Pattern 5: 0101 (binary)
  [
    [1, 2],
    [1, 2],
  ],
  // Pattern 6: 0110 (binary)
  [
    [1, 2],
    [2, 1],
  ],
  // Pattern 7: 0111 (binary)
  [
    [1, 2],
    [2, 2],
  ],
  // Pattern 8: 1000 (binary)
  [
    [2, 1],
    [1, 1],
  ],
  // Pattern 9: 1001 (binary)
  [
    [2, 1],
    [1, 2],
  ],
  // Pattern 10: 1010 (binary)
  [
    [2, 1],
    [2, 1],
  ],
  // Pattern 11: 1011 (binary)
  [
    [2, 1],
    [2, 2],
  ],
  // Pattern 12: 1100 (binary)
  [
    [2, 2],
    [1, 1],
  ],
  // Pattern 13: 1101 (binary)
  [
    [2, 2],
    [1, 2],
  ],
  // Pattern 14: 1110 (binary)
  [
    [2, 2],
    [2, 1],
  ],
  // Pattern 15: 1111 (binary) - All dark
  [
    [2, 2],
    [2, 2],
  ],
];

// Default game state values
export const DEFAULT_VALUES = {
  SEED: 12345, // Default seed for testing
  SCORE: 0,
  INITIAL_POSITION: { x: 7, y: -2 }, // Center top of board, higher to avoid collision
  TIMELINE_START: {
    x: 0,
    speed: TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL,
    timer: 0,
    active: true,
  }, // Frame-based timing
};
