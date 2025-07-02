import type { GameState } from '@/types';

/**
 * Real game states captured from gameplay for testing.
 *
 * These states represent specific scenarios that occur during actual gameplay,
 * making them valuable for regression testing and edge case validation.
 */

/**
 * Falling columns glitches
 */
export const gameState: GameState = {
  board: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 1, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 2, 1, 1, 2, 1, 1, 2, 2, 1, 0, 0, 0, 0],
  ],
  currentBlock: {
    pattern: [
      [2, 1],
      [2, 2],
    ],
    id: '34d22526',
  },
  queue: [
    {
      pattern: [
        [2, 2],
        [1, 1],
      ],
      id: '48502f5e',
    },
    {
      pattern: [
        [1, 1],
        [1, 1],
      ],
      id: 'fb36c0c2',
    },
    {
      pattern: [
        [1, 2],
        [1, 1],
      ],
      id: '00dc4892',
    },
  ],
  blockPosition: {
    x: 7,
    y: -2,
  },
  status: 'playing',
  score: 77,
  countdown: 0,
  gameTimer: 1516,
  detectedPatterns: [
    {
      x: 3,
      y: 6,
      color: 2,
    },
    {
      x: 5,
      y: 6,
      color: 1,
    },
    {
      x: 6,
      y: 6,
      color: 1,
    },
    {
      x: 5,
      y: 7,
      color: 1,
    },
    {
      x: 6,
      y: 7,
      color: 1,
    },
    {
      x: 7,
      y: 7,
      color: 1,
    },
    {
      x: 8,
      y: 7,
      color: 1,
    },
    {
      x: 9,
      y: 7,
      color: 1,
    },
    {
      x: 4,
      y: 8,
      color: 1,
    },
    {
      x: 7,
      y: 8,
      color: 1,
    },
  ],
  frame: 2084,
  dropTimer: 1,
  dropInterval: 90,
  timeline: {
    x: 10,
    sweepInterval: 15,
    timer: 14,
    active: true,
    holdingScore: 10,
  },
  fallingColumns: [
    {
      x: 5,
      cells: [
        {
          id: '43e1e7fe',
          y: 2,
          color: 2,
        },
        {
          id: '4828088a',
          y: 1,
          color: 1,
        },
      ],
      timer: 0,
    },
    {
      x: 6,
      cells: [
        {
          id: 'fa1d430f',
          y: 2,
          color: 1,
        },
        {
          id: 'ffec8d45',
          y: 1,
          color: 2,
        },
      ],
      timer: 0,
    },
  ],
  markedCells: [
    {
      x: 3,
      y: 6,
      color: 2,
    },
    {
      x: 3,
      y: 7,
      color: 2,
    },
    {
      x: 4,
      y: 8,
      color: 1,
    },
    {
      x: 4,
      y: 9,
      color: 1,
    },
    {
      x: 4,
      y: 6,
      color: 2,
    },
    {
      x: 4,
      y: 7,
      color: 2,
    },
    {
      x: 5,
      y: 6,
      color: 1,
    },
    {
      x: 5,
      y: 7,
      color: 1,
    },
    {
      x: 5,
      y: 8,
      color: 1,
    },
    {
      x: 5,
      y: 9,
      color: 1,
    },
    {
      x: 6,
      y: 6,
      color: 1,
    },
    {
      x: 6,
      y: 7,
      color: 1,
    },
    {
      x: 6,
      y: 8,
      color: 1,
    },
    {
      x: 7,
      y: 7,
      color: 1,
    },
    {
      x: 7,
      y: 8,
      color: 1,
    },
    {
      x: 7,
      y: 9,
      color: 1,
    },
    {
      x: 7,
      y: 6,
      color: 1,
    },
    {
      x: 8,
      y: 7,
      color: 1,
    },
    {
      x: 8,
      y: 8,
      color: 1,
    },
    {
      x: 8,
      y: 9,
      color: 1,
    },
    {
      x: 9,
      y: 7,
      color: 1,
    },
    {
      x: 9,
      y: 8,
      color: 1,
    },
    {
      x: 10,
      y: 7,
      color: 1,
    },
    {
      x: 10,
      y: 8,
      color: 1,
    },
  ],
  seed: '1751432649457',
  rngState: 495,
  lastUpdateTime: 0,
  debugMode: true,
};
