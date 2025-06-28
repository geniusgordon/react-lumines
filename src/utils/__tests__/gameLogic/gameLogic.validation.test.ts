import { describe, it, expect, beforeEach } from 'vitest';

import { BOARD_HEIGHT } from '@/constants';
import type { GameBoard, Block, FallingColumn } from '@/types/game';
import { createEmptyBoard, isValidPosition } from '@/utils/gameLogic';

describe('Position validation', () => {
  let board: GameBoard;
  let block: Block;

  beforeEach(() => {
    board = createEmptyBoard();
    block = {
      pattern: [
        [1, 1],
        [1, 1],
      ],
      id: 'test-block',
    };
  });

  it('should allow valid positions', () => {
    expect(isValidPosition(board, block, { x: 0, y: 0 }, [])).toBe('valid');
    expect(isValidPosition(board, block, { x: 7, y: 4 }, [])).toBe('valid');
    expect(isValidPosition(board, block, { x: 14, y: 8 }, [])).toBe('valid');
  });

  it('should detect out of bounds positions', () => {
    expect(isValidPosition(board, block, { x: -1, y: 0 }, [])).toBe(
      'out_of_bounds'
    );
    expect(isValidPosition(board, block, { x: 15, y: 0 }, [])).toBe(
      'out_of_bounds'
    );

    expect(
      isValidPosition(board, block, { x: 0, y: BOARD_HEIGHT - 1 }, [])
    ).toBe('out_of_bounds');
  });

  it('should detect collisions with placed blocks', () => {
    board[0][0] = 1;
    expect(isValidPosition(board, block, { x: 0, y: 0 }, [])).toBe('collision');
  });

  it('should allow blocks above the board', () => {
    const tallBlock: Block = {
      pattern: [
        [1, 1],
        [1, 1],
        [1, 1],
      ],
      id: 'tall-block',
    };
    expect(isValidPosition(board, tallBlock, { x: 0, y: 0 }, [])).toBe('valid');
  });

  it('should detect collisions with falling columns', () => {
    const fallingColumns: FallingColumn[] = [
      {
        x: 1,
        cells: [
          { id: 'falling1', y: 1, color: 2 },
          { id: 'falling2', y: 3, color: 1 },
        ],
        timer: 5,
      },
      {
        x: 5,
        cells: [{ id: 'falling3', y: 2, color: 1 }],
        timer: 2,
      },
    ];

    // Should detect collision with falling cell at (1, 1)
    expect(isValidPosition(board, block, { x: 0, y: 0 }, fallingColumns)).toBe(
      'collision'
    );

    // Should detect collision with falling cell at (1, 3)
    expect(isValidPosition(board, block, { x: 0, y: 2 }, fallingColumns)).toBe(
      'collision'
    );

    // Should detect collision with falling cell at (5, 2)
    expect(isValidPosition(board, block, { x: 4, y: 1 }, fallingColumns)).toBe(
      'collision'
    );

    // Should be valid when not colliding with any falling cells
    expect(isValidPosition(board, block, { x: 0, y: 4 }, fallingColumns)).toBe(
      'valid'
    );
    expect(isValidPosition(board, block, { x: 2, y: 0 }, fallingColumns)).toBe(
      'valid'
    );
  });

  it('should work without falling columns parameter', () => {
    // Should work the same as before when fallingColumns is not provided
    expect(isValidPosition(board, block, { x: 0, y: 0 }, [])).toBe('valid');
    expect(isValidPosition(board, block, { x: -1, y: 0 }, [])).toBe(
      'out_of_bounds'
    );

    board[0][0] = 1;
    expect(isValidPosition(board, block, { x: 0, y: 0 }, [])).toBe('collision');
  });
});
