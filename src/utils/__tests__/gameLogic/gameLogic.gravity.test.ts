import { describe, it, expect, beforeEach } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { GameBoard, CellValue } from '@/types/game';
import {
  createEmptyBoard,
  clearMarkedCellsAndApplyGravity,
  applyGravity,
} from '@/utils/gameLogic';

describe('Gravity and Clearing', () => {
  let board: GameBoard;

  beforeEach(() => {
    board = createEmptyBoard();
  });

  it('should apply gravity correctly', () => {
    board[5][3] = 1;
    board[7][3] = 2;
    board[2][5] = 1;

    const newBoard = applyGravity(board);

    // Column 3: blocks should fall to bottom
    expect(newBoard[BOARD_HEIGHT - 2][3]).toBe(1); // Was at 7, now at bottom
    expect(newBoard[BOARD_HEIGHT - 1][3]).toBe(2); // Was at 5, now at bottom
    expect(newBoard[5][3]).toBe(0); // Original position cleared
    expect(newBoard[7][3]).toBe(0); // Original position cleared

    // Column 5: single block should fall
    expect(newBoard[BOARD_HEIGHT - 1][5]).toBe(1);
    expect(newBoard[2][5]).toBe(0);
  });

  it('should apply gravity in complex scenarios with gaps', () => {
    // Create a state with complex floating blocks pattern
    board[4][3] = 1; // Stack of blocks
    board[5][3] = 2;
    board[6][3] = 1;
    board[8][3] = 2; // Gap, these should fall down
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
     * 8   . . . 2 . . . . . .  ← floating block (will fall)
     * 9   . . . . . . . . . .  ← ground level
     */

    const newBoard = applyGravity(board);

    /*
     * Expected result after gravity:
     *     0 1 2 3 4 5 6 7 8 9
     * 0   . . . . . . . . . .
     * 1   . . . . . . . . . .
     * 2   . . . . . . . . . .
     * 3   . . . . . . . . . .
     * 4   . . . . . . . . . .
     * 5   . . . . . . . . . .
     * 6   . . . 1 . . . . . .  ← stack bottom (was at row 4)
     * 7   . . . 2 . . . . . .  ← stack middle (was at row 5)
     * 8   . . . 1 . . . . . .  ← stack bottom (was at row 6)
     * 9   . . . 2 . . . 1 . .  ← floating block fell + isolated block fell
     */
    expect(newBoard[BOARD_HEIGHT - 4][3]).toBe(1); // Bottom of stack
    expect(newBoard[BOARD_HEIGHT - 3][3]).toBe(2);
    expect(newBoard[BOARD_HEIGHT - 2][3]).toBe(1);
    expect(newBoard[BOARD_HEIGHT - 1][3]).toBe(2); // Blocks fell to fill the gap
    expect(newBoard[BOARD_HEIGHT - 1][7]).toBe(1); // Isolated block fell to bottom

    // Original positions should be cleared
    expect(newBoard[4][3]).toBe(0);
    expect(newBoard[5][3]).toBe(0);
    expect(newBoard[BOARD_HEIGHT - 4][3]).toBe(1); // This one stayed in place (already at bottom of stack)
    expect(newBoard[2][7]).toBe(0);
  });

  it('should handle gravity with multiple columns', () => {
    // Create floating blocks in multiple columns
    board[3][1] = 1;
    board[6][1] = 2;
    board[2][5] = 2;
    board[4][5] = 1;
    board[7][5] = 1;
    board[1][9] = 1;

    const newBoard = applyGravity(board);

    // Column 1: two blocks should stack at bottom
    expect(newBoard[BOARD_HEIGHT - 2][1]).toBe(1); // Was at 6
    expect(newBoard[BOARD_HEIGHT - 1][1]).toBe(2); // Was at 3
    expect(newBoard[3][1]).toBe(0); // Original position cleared
    expect(newBoard[6][1]).toBe(0); // Original position cleared

    // Column 5: three blocks should stack at bottom
    expect(newBoard[BOARD_HEIGHT - 3][5]).toBe(2); // Was at 2
    expect(newBoard[BOARD_HEIGHT - 2][5]).toBe(1); // Was at 4
    expect(newBoard[BOARD_HEIGHT - 1][5]).toBe(1); // Was at 7, already at bottom
    expect(newBoard[2][5]).toBe(0); // Original position cleared
    expect(newBoard[4][5]).toBe(0); // Original position cleared

    // Column 9: single block should fall to bottom
    expect(newBoard[BOARD_HEIGHT - 1][9]).toBe(1);
    expect(newBoard[1][9]).toBe(0); // Original position cleared
  });

  it('should preserve stacked blocks correctly', () => {
    // Create a tower of blocks that are already properly stacked
    board[BOARD_HEIGHT - 3][4] = 1;
    board[BOARD_HEIGHT - 2][4] = 2;
    board[BOARD_HEIGHT - 1][4] = 1;

    const newBoard = applyGravity(board);

    // Should remain in the same positions since they're already stacked
    expect(newBoard[BOARD_HEIGHT - 3][4]).toBe(1);
    expect(newBoard[BOARD_HEIGHT - 2][4]).toBe(2);
    expect(newBoard[BOARD_HEIGHT - 1][4]).toBe(1);
  });

  it('should handle empty board', () => {
    const newBoard = applyGravity(board);

    // Should remain empty
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(newBoard[y][x]).toBe(0);
      }
    }
  });

  it('should clear squares and apply gravity', () => {
    // Create floating blocks above a square
    board[2][5] = 1;
    board[3][5] = 2;

    // Create square that will be cleared
    board[7][5] = 1;
    board[7][6] = 1;
    board[8][5] = 1;
    board[8][6] = 1;

    const squares = [
      {
        x: 5,
        y: 7,
        color: 1 as CellValue,
      },
      {
        x: 5,
        y: 8,
        color: 1 as CellValue,
      },
      {
        x: 6,
        y: 7,
        color: 1 as CellValue,
      },
      {
        x: 6,
        y: 8,
        color: 1 as CellValue,
      },
    ];

    const { newBoard, newFallingColumns } = clearMarkedCellsAndApplyGravity(
      board,
      squares,
      []
    );

    // Square should be cleared
    expect(newBoard[7][5]).toBe(0);
    expect(newBoard[8][6]).toBe(0);

    expect(newFallingColumns).toEqual([
      {
        x: 5,
        cells: [
          { y: 3, color: 2, id: newFallingColumns[0].cells[0].id },
          { y: 2, color: 1, id: newFallingColumns[0].cells[1].id },
        ],
        timer: 0,
      },
    ]);
  });
});
