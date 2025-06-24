import { describe, it, expect, beforeEach } from 'vitest';

import type { Block, GameBoard } from '@/types/game';

import {
  createEmptyBoard,
  findDropPosition,
  placeBlockOnBoard,
  canPlaceAnyPartOfBlock,
} from '../gameLogic';

describe('Block Placement', () => {
  let board: GameBoard;
  let block: Block;

  beforeEach(() => {
    board = createEmptyBoard();
    block = {
      pattern: [
        [1, 2],
        [1, 2],
      ],
      rotation: 0,
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
    expect(dropPos).toEqual({ x: 5, y: 8 }); // Bottom of board
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
      rotation: 0,
      id: 'test',
    };

    // Try to place block at position (0, 0) - column 0 is free, column 1 is blocked
    const newBoard = placeBlockOnBoard(board, testBlock, {
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
});
