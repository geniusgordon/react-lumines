import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeBoardColorBalance } from '../boardColorBalance';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

describe('computeBoardColorBalance', () => {
  it('returns zero balance for an empty board', () => {
    expect(computeBoardColorBalance(emptyBoard())).toEqual({
      light: 0,
      dark: 0,
      delta: 0,
      magnitudeRatio: 0,
    });
  });

  it('counts light and dark cells on the board', () => {
    const board = emptyBoard();
    board[9][0] = 1;
    board[9][1] = 1;
    board[9][2] = 1;
    board[8][0] = 2;
    const result = computeBoardColorBalance(board);
    expect(result.light).toBe(3);
    expect(result.dark).toBe(1);
    expect(result.delta).toBe(2);
    expect(result.magnitudeRatio).toBeCloseTo(0.5);
  });

  it('reports a balanced board with delta 0', () => {
    const board = emptyBoard();
    board[9][0] = 1;
    board[9][1] = 2;
    const result = computeBoardColorBalance(board);
    expect(result.delta).toBe(0);
    expect(result.magnitudeRatio).toBe(0);
  });

  it('reports full imbalance for a single-colour board', () => {
    const board = emptyBoard();
    board[9][0] = 2;
    board[9][1] = 2;
    const result = computeBoardColorBalance(board);
    expect(result.light).toBe(0);
    expect(result.dark).toBe(2);
    expect(result.delta).toBe(-2);
    expect(result.magnitudeRatio).toBe(1);
  });
});
