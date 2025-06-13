import type { GameConfig, ControlsConfig } from '../types/game';

// Core game dimensions
export const BOARD_WIDTH = 16;
export const BOARD_HEIGHT = 10;
export const BLOCK_SIZE = 2;

// Timing constants (deterministic frame-based)
export const TARGET_FPS = 60;
export const FRAME_INTERVAL_MS = 1000 / TARGET_FPS; // 16.67ms per frame
export const INITIAL_DROP_INTERVAL = 48; // frames (0.8 seconds at 60 FPS)

// Timeline sweep speed
export const TIMELINE_SPEED = 2; // pixels per frame

// Control key mappings
export const DEFAULT_CONTROLS: ControlsConfig = {
  moveLeft: ['ArrowLeft', 'KeyA'],
  moveRight: ['ArrowRight', 'KeyD'],
  rotateCW: ['KeyX', 'ArrowUp'],
  rotateCCW: ['KeyZ', 'KeyQ'],
  softDrop: ['ArrowDown', 'KeyS'],
  hardDrop: ['Space'],
  pause: ['KeyP', 'Escape']
};

// Color scheme - Dark Theme
export const GAME_COLORS = {
  light: '#FAFAFA',      // Light blocks - very light gray/white
  dark: '#FF9800',       // Dark blocks - orange
  empty: '#424242',      // Empty cells - dark background
  grid: '#616161',       // Subtle grid lines - medium gray
  timeline: '#4CAF50',   // Green accent for timeline sweep
  background: '#424242', // Dark background
  text: '#FAFAFA',       // Light text for dark theme
  ui: '#757575',         // UI elements - lighter gray
  accent: '#FF9800',     // Orange accent color
  success: '#4CAF50',    // Green for positive feedback
  warning: '#FFC107',    // Yellow for warnings
  error: '#F44336'       // Red for errors/game over
};

// Complete game configuration
export const GAME_CONFIG: GameConfig = {
  board: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT
  },
  timing: {
    targetFPS: TARGET_FPS,
    frameInterval: FRAME_INTERVAL_MS,
    initialDropInterval: INITIAL_DROP_INTERVAL
  },
  controls: DEFAULT_CONTROLS,
  colors: GAME_COLORS
};

// Block patterns (2x2 grids with different color combinations)
export const BLOCK_PATTERNS = [
  // All light
  [[1, 1], [1, 1]],
  // All dark  
  [[2, 2], [2, 2]],
  // Mixed patterns
  [[1, 2], [1, 2]], // Vertical split
  [[1, 1], [2, 2]], // Horizontal split
  [[1, 2], [2, 1]], // Diagonal
  [[2, 1], [1, 2]], // Reverse diagonal
  [[1, 2], [1, 1]], // L-shape variants
  [[2, 1], [2, 2]],
  [[1, 1], [1, 2]],
  [[2, 2], [2, 1]]
];

// Scoring system - Count overlapping 2×2 rectangles
export const SCORING = {
  OVERLAPPING_2X2_FORMULA: '(width - 1) × (height - 1)',  // Formula for overlapping rectangles
  MIN_RECTANGLE_SIZE: 2       // Minimum size for valid rectangles
};

// Time attack mode - no level progression
export const TIME_ATTACK_CONFIG = {
  FIXED_DROP_INTERVAL: 48,    // Constant drop speed (frames between drops)
  GAME_DURATION: 180000       // 3 minutes in milliseconds (optional for timed mode)
};

// Replay system constants
export const REPLAY_CONFIG = {
  VERSION: '1.0',
  CHECKPOINT_INTERVAL: 300,   // Save checkpoint every 5 seconds (300 frames)
  MAX_REPLAY_SIZE: 1000000,   // 1MB max replay file size
  COMPRESSION: false          // No compression for MVP
};

// Animation timing (in frames)
export const ANIMATION_FRAMES = {
  BLOCK_DROP: 8,              // Hard drop animation
  RECTANGLE_CLEAR: 12,        // Rectangle clearing animation
  TIMELINE_SWEEP: 4,          // Timeline sweep effect
  GAME_OVER: 30              // Game over animation
};

// Development/debug constants
export const DEBUG_CONFIG = {
  SHOW_FPS: false,            // Show FPS counter
  SHOW_GRID_COORDS: false,    // Show grid coordinates
  SHOW_COLLISION_DEBUG: false, // Show collision detection areas
  LOG_ACTIONS: false,         // Log game actions to console
  ENABLE_CHEATS: false        // Enable debug cheats
};

// Default game state values
export const DEFAULT_VALUES = {
  SEED: 12345,               // Default seed for testing
  SCORE: 0,
  RECTANGLES_CLEARED: 0,
  INITIAL_POSITION: { x: 7, y: 0 }, // Center top of board
  TIMELINE_START: { x: 0, speed: TIMELINE_SPEED, active: false }
}; 