import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeFrozenGrowth } from '../frozenGrowth';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

describe('computeFrozenGrowth', () => {
  it('has zero seal pressure on an empty board', () => {
    const r = computeFrozenGrowth(emptyBoard());
    expect(r.sealPressure.light).toBe(0);
    expect(r.sealPressure.dark).toBe(0);
  });

  it('counts an open window where a light pair can still close monochrome', () => {
    const board = emptyBoard();
    board[8][4] = 1;
    board[9][4] = 1; // two light cells, neighbours empty
    const r = computeFrozenGrowth(board);
    expect(r.open.light).toBeGreaterThan(0);
    expect(r.blocked.light).toBe(0);
    expect(r.sealPressure.light).toBe(0);
  });

  it('counts a window blocked for light when the opposite color contaminates it', () => {
    const board = emptyBoard();
    board[8][4] = 1;
    board[8][5] = 2; // dark next to light in the same 2x2 window
    const r = computeFrozenGrowth(board);
    expect(r.blocked.light).toBeGreaterThan(0);
    expect(r.sealPressure.light).toBeGreaterThan(0);
  });
});
