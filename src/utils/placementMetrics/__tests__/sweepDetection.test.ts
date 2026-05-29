import { describe, expect, it } from 'vitest';

import type { GameState, Square } from '@/types/game';

import { detectPayout } from '../sweepDetection';

// Minimal GameState stub carrying only the fields detectPayout reads.
function stateWith(score: number, marked: Square[]): GameState {
  return { score, markedCells: marked } as unknown as GameState;
}

const cell: Square = { x: 0, y: 0, color: 1 };

describe('detectPayout', () => {
  it('reports a payout when markedCells go from non-empty to empty', () => {
    const pre = stateWith(100, [cell, cell, cell, cell]);
    const post = stateWith(110, []);
    expect(detectPayout(pre, post)).toEqual({
      payout: true,
      clearedCells: 4,
      scoreDelta: 10,
    });
  });

  it('reports no payout when cells are merely being marked (grows, not cleared)', () => {
    const pre = stateWith(100, [cell]);
    const post = stateWith(100, [cell, cell, cell]);
    const result = detectPayout(pre, post);
    expect(result.payout).toBe(false);
    expect(result.clearedCells).toBe(0);
    expect(result.scoreDelta).toBe(0);
  });

  it('reports no payout on a quiet tick with no marked cells', () => {
    const pre = stateWith(100, []);
    const post = stateWith(100, []);
    expect(detectPayout(pre, post)).toEqual({
      payout: false,
      clearedCells: 0,
      scoreDelta: 0,
    });
  });

  it('still carries scoreDelta even when no payout occurred', () => {
    const pre = stateWith(100, []);
    const post = stateWith(105, []);
    expect(detectPayout(pre, post).scoreDelta).toBe(5);
  });
});
