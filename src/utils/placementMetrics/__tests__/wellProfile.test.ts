import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeWellProfile } from '../wellProfile';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

// Fill a column from the bottom up to the given height.
function stackColumn(board: GameBoard, x: number, height: number): void {
  for (let y = BOARD_HEIGHT - 1; y >= BOARD_HEIGHT - height; y--) {
    board[y][x] = 1;
  }
}

describe('computeWellProfile', () => {
  it('is flat and well-free for an empty board', () => {
    const r = computeWellProfile(emptyBoard());
    expect(r.heights).toHaveLength(BOARD_WIDTH);
    expect(r.bumpiness).toBe(0);
    expect(r.maxWellDepth).toBe(0);
    expect(r.deepWellCount).toBe(0);
  });

  it('measures the depth of a 1-wide gap between two tall stacks', () => {
    const board = emptyBoard();
    stackColumn(board, 4, 6);
    stackColumn(board, 6, 6);
    // column 5 is an empty 1-wide well of depth 6
    const r = computeWellProfile(board);
    expect(r.heights[5]).toBe(0);
    expect(r.maxWellDepth).toBe(6);
    expect(r.deepWellCount).toBe(1); // depth >= 3 default threshold
  });

  it('treats an edge gap next to a tall stack as a well (wall = full height)', () => {
    const board = emptyBoard();
    stackColumn(board, 1, 5);
    // column 0 is flanked by the left wall (full height) and a height-5 stack
    const r = computeWellProfile(board);
    expect(r.maxWellDepth).toBe(5);
  });

  it('reports bumpiness as summed adjacent height differences', () => {
    const board = emptyBoard();
    stackColumn(board, 0, 2);
    stackColumn(board, 1, 5);
    const r = computeWellProfile(board);
    // |2-5| + |5-0| + 0... = 3 + 5 = 8
    expect(r.bumpiness).toBe(8);
  });
});
