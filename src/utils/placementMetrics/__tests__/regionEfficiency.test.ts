import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { computeRegionEfficiency } from '../regionEfficiency';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

function fillRect(
  board: GameBoard,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: CellValue
): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      board[y][x] = color;
    }
  }
}

describe('computeRegionEfficiency', () => {
  it('reports nothing for an empty board', () => {
    const r = computeRegionEfficiency(emptyBoard());
    expect(r.regions).toEqual([]);
    expect(r.totalWindows).toBe(0);
    expect(r.meanEfficiency).toBe(0);
  });

  it('counts 9 internal windows in a 4x4 square (the provable case)', () => {
    const board = emptyBoard();
    fillRect(board, 2, 2, 4, 4, 1);
    const r = computeRegionEfficiency(board);
    expect(r.totalWindows).toBe(9); // (4-1)*(4-1)
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].cells).toBe(16);
    expect(r.regions[0].efficiency).toBeCloseTo(9 / 16);
  });

  it('ranks a 4x4 square above an equal-area 2x8 strip', () => {
    const square = emptyBoard();
    fillRect(square, 0, 0, 4, 4, 2);
    const strip = emptyBoard();
    fillRect(strip, 0, 0, 8, 2, 2);
    const sq = computeRegionEfficiency(square).regions[0];
    const st = computeRegionEfficiency(strip).regions[0];
    expect(sq.windows).toBe(9);
    expect(st.windows).toBe(7); // (8-1)*(2-1)
    expect(sq.efficiency).toBeGreaterThan(st.efficiency);
  });

  it('separates two regions of different colors', () => {
    const board = emptyBoard();
    fillRect(board, 0, 0, 2, 2, 1);
    fillRect(board, 5, 5, 2, 2, 2);
    const r = computeRegionEfficiency(board);
    expect(r.regions).toHaveLength(2);
    expect(r.totalWindows).toBe(2);
  });
});
