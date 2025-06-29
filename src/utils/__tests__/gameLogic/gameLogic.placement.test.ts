import { describe, it, expect, beforeEach } from 'vitest';

import { BOARD_HEIGHT } from '@/constants';
import type { Block, GameBoard, CellValue } from '@/types/game';
import {
  createEmptyBoard,
  findDropPosition,
  placeBlockOnBoard,
  canPlaceAnyPartOfBlock,
} from '@/utils/gameLogic';

describe('Block Placement', () => {
  let board: GameBoard;
  let block: Block;

  beforeEach(() => {
    board = createEmptyBoard();
    block = {
      pattern: [
        [2, 1],
        [1, 2],
      ],
      id: 'test',
    };
  });

  it('should find correct drop position', () => {
    board[8][5] = 1; // Obstacle at bottom

    const dropPos = findDropPosition(board, block, { x: 5, y: 0 }, []);
    expect(dropPos).toEqual({ x: 5, y: 6 }); // Should stop above obstacle
  });

  it('should drop to bottom when no obstacles', () => {
    const dropPos = findDropPosition(board, block, { x: 5, y: 0 }, []);
    expect(dropPos).toEqual({ x: 5, y: BOARD_HEIGHT - 2 }); // Bottom of board
  });

  it('should allow partial placement when only one column has space', () => {
    // Fill column 1 but leave column 0 empty
    board[0][1] = 1;
    board[1][1] = 1;

    const testBlock: Block = {
      pattern: [
        [2, 2],
        [2, 2],
      ],
      id: 'test',
    };

    // Try to place block at position (0, 0) - column 0 is free, column 1 is blocked
    const newBoard = placeBlockOnBoard(board, [], testBlock, {
      x: 0,
      y: 0,
    });

    // Should place only the cells that fit (2 cells in column 0)
    expect(newBoard[0][0]).toBe(2); // New block placed
    expect(newBoard[1][0]).toBe(2); // New block placed
    expect(newBoard[0][1]).toBe(1); // Original block remains (collision avoided)
    expect(newBoard[1][1]).toBe(1); // Original block remains (collision avoided)
  });

  it('should trigger game over only when no placement is possible', () => {
    // Fill most of the board but leave one space
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 16; x++) {
        if (!(x === 15 && y === 0)) {
          board[y][x] = 1;
        }
      }
    }

    // Should not be game over since partial placement is still possible
    expect(canPlaceAnyPartOfBlock(board, { x: 14, y: 0 })).toBe(true);
  });

  it('should detect true game over when no cells can be placed', () => {
    // Fill the top rows to make spawning impossible
    // This simulates a realistic game over where blocks have stacked too high
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 16; x++) {
        board[y][x] = 1;
      }
    }

    // With top 3 rows filled and spawn at y=-2, no visible part can be placed
    expect(canPlaceAnyPartOfBlock(board, { x: 14, y: 0 })).toBe(false);
  });

  describe('Block placement above board (position.y < 0)', () => {
    it('should place full block when spawning above empty board', () => {
      const newBoard = placeBlockOnBoard(board, [], block, { x: 5, y: -2 });

      // Block should be placed in rows 0 and 1
      expect(newBoard[0][5]).toBe(2);
      expect(newBoard[1][5]).toBe(1);
      expect(newBoard[0][6]).toBe(1);
      expect(newBoard[1][6]).toBe(2);
    });

    it('should place full block when spawning at y=-1', () => {
      const newBoard = placeBlockOnBoard(board, [], block, { x: 5, y: -1 });

      // Block should be placed in rows 0 and 1
      expect(newBoard[0][5]).toBe(2);
      expect(newBoard[1][5]).toBe(1);
      expect(newBoard[0][6]).toBe(1);
      expect(newBoard[1][6]).toBe(2);
    });

    it('should partially place block when one row is blocked', () => {
      // Block row 1 (second row)
      board[1][5] = 2;
      board[1][6] = 2;

      const newBoard = placeBlockOnBoard(board, [], block, { x: 5, y: -2 });

      // Only top row should be placed
      expect(newBoard[0][5]).toBe(1);
      expect(newBoard[0][6]).toBe(2);
      // Bottom row should remain blocked
      expect(newBoard[1][5]).toBe(2);
      expect(newBoard[1][6]).toBe(2);
    });

    it('should partially place block when one column is blocked', () => {
      // Block column 6 (right side)
      board[0][6] = 1;
      board[1][6] = 1;

      const newBoard = placeBlockOnBoard(board, [], block, { x: 5, y: -2 });

      // Only left column should be placed
      expect(newBoard[0][5]).toBe(2);
      expect(newBoard[1][5]).toBe(1);
      // Right column should remain blocked
      expect(newBoard[0][6]).toBe(1);
      expect(newBoard[1][6]).toBe(1);
    });

    it('should not place block when spawn area is completely blocked', () => {
      // Block entire spawn area
      board[0][5] = 1;
      board[1][5] = 1;
      board[0][6] = 1;
      board[1][6] = 1;

      const newBoard = placeBlockOnBoard(board, [], block, { x: 5, y: -2 });

      // No changes should occur
      expect(newBoard[0][5]).toBe(1);
      expect(newBoard[1][5]).toBe(1);
      expect(newBoard[0][6]).toBe(1);
      expect(newBoard[1][6]).toBe(1);
    });

    it('should respect falling columns when placing above board', () => {
      const fallingColumns = [
        {
          x: 6,
          cells: [{ id: 'fall1', y: 1, color: 2 as CellValue }],
          timer: 0,
        },
      ];

      const newBoard = placeBlockOnBoard(board, fallingColumns, block, {
        x: 5,
        y: -2,
      });

      // Left column should place normally
      expect(newBoard[0][5]).toBe(2);
      expect(newBoard[1][5]).toBe(1);
      // Right column blocked by falling cell at y=1, should only place in row 0
      expect(newBoard[0][6]).toBe(2);
      expect(newBoard[1][6]).toBe(0); // Should remain empty due to falling cell
    });

    it('should handle falling columns at different heights', () => {
      const fallingColumns = [
        {
          x: 5,
          cells: [{ id: 'fall1', y: 0, color: 1 as CellValue }],
          timer: 0,
        },
      ];

      const newBoard = placeBlockOnBoard(board, fallingColumns, block, {
        x: 5,
        y: -2,
      });

      // Left column blocked by falling cell at y=0, no placement possible
      expect(newBoard[0][5]).toBe(0);
      expect(newBoard[1][5]).toBe(0);
      // Right column should place normally
      expect(newBoard[0][6]).toBe(1);
      expect(newBoard[1][6]).toBe(2);
    });

    it('should handle multiple falling columns', () => {
      const fallingColumns = [
        {
          x: 5,
          cells: [{ id: 'fall1', y: 1, color: 1 as CellValue }],
          timer: 0,
        },
        {
          x: 6,
          cells: [{ id: 'fall2', y: 0, color: 2 as CellValue }],
          timer: 0,
        },
      ];

      const newBoard = placeBlockOnBoard(board, fallingColumns, block, {
        x: 5,
        y: -2,
      });

      // Left column: falling cell at y=1, can place in row 0
      expect(newBoard[0][5]).toBe(1);
      expect(newBoard[1][5]).toBe(0); // Blocked by falling cell
      // Right column: falling cell at y=0, no placement possible
      expect(newBoard[0][6]).toBe(0);
      expect(newBoard[1][6]).toBe(0);
    });

    it('should place block when falling columns have cells below spawn area', () => {
      const fallingColumns = [
        {
          x: 5,
          cells: [{ id: 'fall1', y: 3, color: 1 as CellValue }],
          timer: 0,
        },
      ];

      const newBoard = placeBlockOnBoard(board, fallingColumns, block, {
        x: 5,
        y: -2,
      });

      // Falling cell is below spawn area, should not interfere
      expect(newBoard[0][5]).toBe(2);
      expect(newBoard[1][5]).toBe(1);
      expect(newBoard[0][6]).toBe(1);
      expect(newBoard[1][6]).toBe(2);
    });
  });
});
