import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeDeadCells } from '../deadCells';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

describe('computeDeadCells', () => {
  it('returns no dead cells for an empty board', () => {
    const result = computeDeadCells(emptyBoard());
    expect(result.count).toBe(0);
    expect(result.cells).toEqual([]);
  });

  it('keeps an isolated cell alive (all neighbours empty)', () => {
    const board = emptyBoard();
    board[5][5] = 1;
    expect(computeDeadCells(board).count).toBe(0);
  });

  it('marks a corner light cell dead while the trapping dark cells stay alive', () => {
    // (15,9) light is trapped: the single 2x2 window touching the corner
    // also contains dark cells, so it can never close monochrome-light.
    // The dark cells each still have an empty up/left window that could
    // close all-dark, so they remain alive. Only the light corner is dead.
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1][BOARD_WIDTH - 1] = 1; // (15,9) light
    board[BOARD_HEIGHT - 1][BOARD_WIDTH - 2] = 2; // (14,9) dark
    board[BOARD_HEIGHT - 2][BOARD_WIDTH - 1] = 2; // (15,8) dark
    board[BOARD_HEIGHT - 2][BOARD_WIDTH - 2] = 2; // (14,8) dark
    const result = computeDeadCells(board);
    expect(result.count).toBe(1);
    expect(result.cells).toContainEqual({
      x: BOARD_WIDTH - 1,
      y: BOARD_HEIGHT - 1,
    });
  });

  it('keeps a light cell alive when at least one window can still close monochrome', () => {
    const board = emptyBoard();
    board[5][5] = 1;
    board[5][6] = 1;
    expect(computeDeadCells(board).count).toBe(0);
  });
});
