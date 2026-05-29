import { describe, expect, it } from 'vitest';

import { computeSweepYield } from '../sweepYield';
import type { SweepEvent } from '../types';

describe('computeSweepYield', () => {
  it('returns zero stats for empty input', () => {
    const result = computeSweepYield([]);
    expect(result).toEqual({ total: 0, mean: 0, perPayout: [] });
  });

  it('sums clearedCells across all payouts', () => {
    const events: SweepEvent[] = [
      { frame: 100, clearedCells: 4, scoreDelta: 100, dropsSincePrevious: 3 },
      { frame: 200, clearedCells: 6, scoreDelta: 200, dropsSincePrevious: 4 },
      { frame: 300, clearedCells: 2, scoreDelta: 50, dropsSincePrevious: 2 },
    ];
    const result = computeSweepYield(events);
    expect(result.total).toBe(12);
    expect(result.mean).toBeCloseTo(4);
    expect(result.perPayout).toBe(events);
  });
});
