import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard, Square } from '@/types/game';

import { analyzePayout } from '../analyzePayout';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

// Build markedCells for a solid light rectangle [x0..x0+w-1] x [y0..y0+h-1].
function lightRect(x0: number, y0: number, w: number, h: number): Square[] {
  const cells: Square[] = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      cells.push({ x, y, color: 1 });
    }
  }
  return cells;
}

describe('analyzePayout', () => {
  it('flags a small payout with same-color material past the gap as bridgeable', () => {
    const board = emptyBoard();
    const marked = lightRect(2, 8, 3, 2); // cashed light field cols 2-4, rows 8-9 (small)
    // gap at col 5; orphaned light field at cols 6-7 in the same rows
    for (let y = 8; y <= 9; y++) {
      board[y][6] = 1;
      board[y][7] = 1;
    }
    const leak = analyzePayout(board, marked, 2, 5);
    expect(leak.premature).toBe(true); // 2 windows < threshold
    expect(leak.bridgeable).toBe(true);
    expect(leak.beyondCells).toBeGreaterThanOrEqual(2);
    expect(leak.dominantColor).toBe(1);
    expect(leak.span).toBe(3);
  });

  it('does not flag a small payout at the board edge with nothing beyond', () => {
    const board = emptyBoard();
    const marked = lightRect(13, 8, 3, 2); // cols 13-15 (right edge)
    const leak = analyzePayout(board, marked, 2, 16 % BOARD_WIDTH); // gap wraps to 0, nothing beyond in band
    expect(leak.premature).toBe(true);
    expect(leak.bridgeable).toBe(false);
  });

  it('does not mark a large payout as premature', () => {
    const board = emptyBoard();
    const marked = lightRect(2, 4, 8, 6); // big field
    const leak = analyzePayout(board, marked, 28, 10);
    expect(leak.premature).toBe(false);
  });
});
