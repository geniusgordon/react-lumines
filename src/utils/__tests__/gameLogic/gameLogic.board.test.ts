import { describe, it, expect } from 'vitest';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import { createEmptyBoard, copyBoard } from '@/utils/gameLogic';

describe('Board Operations', () => {
  it('should create empty board with correct dimensions', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(BOARD_HEIGHT);
    expect(board[0]).toHaveLength(BOARD_WIDTH);

    // All cells should be empty (0)
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(board[y][x]).toBe(0);
      }
    }
  });

  it('should copy board correctly', () => {
    const board = createEmptyBoard();
    board[1][1] = 1;
    board[2][2] = 2;

    const copy = copyBoard(board);
    expect(copy).toEqual(board);

    // Ensure it's a deep copy
    copy[3][3] = 1;
    expect(board[3][3]).toBe(0);
  });
});
