import { describe, it, expect, beforeEach } from 'vitest';

import { BOARD_HEIGHT } from '@/constants';
import type { GameBoard } from '@/types/game';
import { createEmptyBoard, createFallingColumns } from '@/utils/gameLogic';
import { SeededRNGMock } from '@/utils/seededRNG';

describe('Falling cells', () => {
  let board: GameBoard;

  beforeEach(() => {
    board = createEmptyBoard();
  });

  it('should create falling cells', () => {
    // Create a state with complex floating blocks pattern
    board[4][3] = 1; // Stack of blocks
    board[5][3] = 2;
    board[6][3] = 1;
    board[BOARD_HEIGHT - 1][3] = 2;
    board[BOARD_HEIGHT - 1][4] = 1;
    board[2][7] = 1; // Isolated floating block

    /*
     * Board layout (showing only relevant columns):
     *     0 1 2 3 4 5 6 7 8 9
     * 0   . . . . . . . . . .
     * 1   . . . . . . . . . .
     * 2   . . . . . . . 1 . .  ← isolated floating block
     * 3   . . . . . . . . . .
     * 4   . . . 1 . . . . . .  ← top of stack
     * 5   . . . 2 . . . . . .  ← middle of stack
     * 6   . . . 1 . . . . . .  ← bottom of stack
     * 7   . . . . . . . . . .  ← empty gap
     * 8   . . . . . . . . . .  ← floating block (will fall)
     * 9   . . . 2 1 . . . . .  ← ground level
     */

    const { newFallingColumns, newBoard } = createFallingColumns(
      board,
      [],
      new SeededRNGMock([1, 2, 3, 4, 5, 6, 7, 8, 9])
    );

    expect(newFallingColumns[0]).toEqual({
      x: 3,
      cells: [
        { y: 6, color: 1, id: '1' },
        { y: 5, color: 2, id: '2' },
        { y: 4, color: 1, id: '3' },
      ],
      timer: 0,
    });
    expect(newFallingColumns[1]).toEqual({
      x: 7,
      cells: [{ y: 2, color: 1, id: '4' }],
      timer: 0,
    });

    expect(newBoard[4][3]).toBe(0);
    expect(newBoard[5][3]).toBe(0);
    expect(newBoard[6][3]).toBe(0);
    expect(newBoard[BOARD_HEIGHT - 1][3]).toBe(2);
    expect(newBoard[BOARD_HEIGHT - 1][4]).toBe(1);
    expect(newBoard[2][7]).toBe(0);
  });

  it('should create falling cells with existing columns', () => {
    // Create a state with complex floating blocks pattern
    board[5][3] = 2;
    board[6][3] = 1;
    board[BOARD_HEIGHT - 1][3] = 2;
    board[BOARD_HEIGHT - 1][4] = 1;
    board[2][7] = 1; // Isolated floating block

    /*
     * Board layout (showing only relevant columns):
     *     0 1 2 3 4 5 6 7 8 9
     * 0   . . . . . . . . . .
     * 1   . . . . . . . . . .
     * 2   . . . . . . . 1 . .  ← isolated floating block
     * 3   . . . . . . . . . .
     * 4   . . . 1 . . . . . .  ← top of stack
     * 5   . . . 2 . . . . . .  ← middle of stack
     * 6   . . . 1 . . . . . .  ← bottom of stack
     * 7   . . . . . . . . . .  ← empty gap
     * 8   . . . . . . . . . .  ← floating block (will fall)
     * 9   . . . 2 1 . . . . .  ← ground level
     */

    const { newFallingColumns, newBoard } = createFallingColumns(
      board,
      [
        {
          x: 3,
          cells: [
            { y: 4, color: 1, id: '1' },
            { y: 3, color: 1, id: '2' },
          ],
          timer: 0,
        },
      ],
      new SeededRNGMock([3, 4, 5, 6, 7, 8, 9])
    );

    expect(newFallingColumns[0]).toEqual({
      x: 3,
      cells: [
        { y: 6, color: 1, id: '3' },
        { y: 5, color: 2, id: '4' },
        { y: 4, color: 1, id: '1' },
        { y: 3, color: 1, id: '2' },
      ],
      timer: 0,
    });
    expect(newFallingColumns[1]).toEqual({
      x: 7,
      cells: [{ y: 2, color: 1, id: '5' }],
      timer: 0,
    });

    expect(newBoard[4][3]).toBe(0);
    expect(newBoard[5][3]).toBe(0);
    expect(newBoard[6][3]).toBe(0);
    expect(newBoard[BOARD_HEIGHT - 1][3]).toBe(2);
    expect(newBoard[BOARD_HEIGHT - 1][4]).toBe(1);
    expect(newBoard[2][7]).toBe(0);
  });
});
