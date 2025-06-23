import { describe, it, expect, beforeEach } from 'vitest';

import type { Block, GameBoard } from '@/types/game';

import { createEmptyBoard, isValidPosition } from '../gameLogic';

describe('Position Validation', () => {
  let board: GameBoard;
  let block: Block;

  beforeEach(() => {
    board = createEmptyBoard();
    block = {
      pattern: [
        [1, 1],
        [1, 1],
      ],
      rotation: 0,
      id: 'test',
    };
  });

  it('should validate valid positions', () => {
    expect(isValidPosition(board, block, { x: 0, y: 0 })).toBe('valid');
    expect(isValidPosition(board, block, { x: 7, y: 4 })).toBe('valid');
    expect(isValidPosition(board, block, { x: 14, y: 8 })).toBe('valid');
  });

  it('should detect out of bounds positions', () => {
    expect(isValidPosition(board, block, { x: -1, y: 0 })).toBe(
      'out_of_bounds'
    );
    expect(isValidPosition(board, block, { x: 15, y: 0 })).toBe(
      'out_of_bounds'
    );
    // Negative y is now allowed (above board), only test horizontal bounds
    expect(isValidPosition(board, block, { x: 0, y: 9 })).toBe('out_of_bounds');
  });

  it('should detect collisions with existing blocks', () => {
    board[1][1] = 2;
    expect(isValidPosition(board, block, { x: 0, y: 0 })).toBe('collision');
  });

  it('should validate with rotation', () => {
    const tallBlock: Block = {
      pattern: [
        [1, 2],
        [0, 1],
      ],
      rotation: 0,
      id: 'tall',
    };

    expect(isValidPosition(board, tallBlock, { x: 0, y: 0 })).toBe('valid');
  });
});
