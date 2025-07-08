import { v7 } from 'uuid';

import {
  GAME_CONFIG,
  DEFAULT_VALUES,
  TIMER_CONFIG,
} from '@/constants/gameConfig';
import type { GameState } from '@/types/game';
import { generateRandomBlock } from '@/utils/gameLogic/blocks';
import { createEmptyBoard } from '@/utils/gameLogic/board';
import { SeededRNG } from '@/utils/seededRNG';

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
    id: v7(), // Generate unique ID for this game session

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
