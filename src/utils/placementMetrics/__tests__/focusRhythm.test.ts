import { describe, expect, it } from 'vitest';

import type { Square } from '@/types/game';

import { computeFocusRhythm, summarizePayoutColor } from '../focusRhythm';
import type { PayoutColorRecord } from '../types';

function cells(colors: Array<1 | 2>): Square[] {
  return colors.map((color, i) => ({ x: i, y: 0, color }));
}

describe('summarizePayoutColor', () => {
  it('returns the dominant color and its share', () => {
    const r = summarizePayoutColor(cells([1, 1, 1, 2]));
    expect(r.dominantColor).toBe(1);
    expect(r.dominantShare).toBeCloseTo(3 / 4);
  });

  it('returns share 0 for no cleared cells', () => {
    expect(summarizePayoutColor([]).dominantShare).toBe(0);
  });
});

describe('computeFocusRhythm', () => {
  it('is all-zero for no payouts', () => {
    const r = computeFocusRhythm([]);
    expect(r).toEqual({
      payoutCount: 0,
      meanPurity: 0,
      alternationRate: 0,
      handoffRate: 0,
    });
  });

  it('scores perfect alternation and hand-off', () => {
    // clear light -> residual dark (delta<0); clear dark -> residual light (delta>0)
    const records: PayoutColorRecord[] = [
      { dominantColor: 1, dominantShare: 1, postBalanceDelta: -4 },
      { dominantColor: 2, dominantShare: 1, postBalanceDelta: 3 },
      { dominantColor: 1, dominantShare: 1, postBalanceDelta: -2 },
    ];
    const r = computeFocusRhythm(records);
    expect(r.alternationRate).toBe(1);
    expect(r.handoffRate).toBe(1);
    expect(r.meanPurity).toBe(1);
  });

  it('scores zero alternation when the same color repeats', () => {
    const records: PayoutColorRecord[] = [
      { dominantColor: 1, dominantShare: 0.8, postBalanceDelta: 5 },
      { dominantColor: 1, dominantShare: 0.6, postBalanceDelta: 5 },
    ];
    const r = computeFocusRhythm(records);
    expect(r.alternationRate).toBe(0);
    expect(r.handoffRate).toBe(0); // cleared light but residual stayed light-heavy
    expect(r.meanPurity).toBeCloseTo(0.7);
  });
});
