import { describe, expect, it } from 'vitest';

import { computeSweepValue } from '../sweepValue';
import type { SweepEvent } from '../types';

function event(scoreDelta: number): SweepEvent {
  return { frame: 0, clearedCells: 0, scoreDelta, dropsSincePrevious: 0 };
}

describe('computeSweepValue', () => {
  it('returns zeros for no events', () => {
    expect(computeSweepValue([])).toEqual({ totalPoints: 0, meanPoints: 0 });
  });

  it('sums and averages scoreDelta (the real per-payout value)', () => {
    const r = computeSweepValue([event(9), event(3)]);
    expect(r.totalPoints).toBe(12);
    expect(r.meanPoints).toBe(6);
  });
});
