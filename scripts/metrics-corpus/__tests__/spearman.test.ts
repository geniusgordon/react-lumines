import { describe, expect, it } from 'vitest';

import { spearman } from '../spearman';

describe('spearman', () => {
  it('returns 1 for a perfectly increasing monotonic relationship', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
  });

  it('returns -1 for a perfectly decreasing relationship', () => {
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
  });

  it('handles non-linear but monotonic data (rank-based)', () => {
    expect(spearman([1, 2, 3, 4], [1, 4, 9, 16])).toBeCloseTo(1);
  });

  it('averages ranks on ties', () => {
    // ys all equal -> zero variance -> defined as 0
    expect(spearman([1, 2, 3], [5, 5, 5])).toBe(0);
  });

  it('returns 0 for fewer than two points', () => {
    expect(spearman([1], [2])).toBe(0);
  });
});
