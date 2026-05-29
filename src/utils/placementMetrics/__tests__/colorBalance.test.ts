import { describe, expect, it } from 'vitest';

import { computeColorBalance } from '../colorBalance';

describe('computeColorBalance', () => {
  it('returns zero balance for empty input', () => {
    expect(computeColorBalance([])).toEqual({
      light: 0,
      dark: 0,
      delta: 0,
      magnitudeRatio: 0,
      perDropCumulative: [],
    });
  });

  it('counts cells of pattern 0 (all light) and pattern 15 (all dark)', () => {
    // Pattern 0 = [[1,1],[1,1]] -> 4 light, 0 dark
    // Pattern 15 = [[2,2],[2,2]] -> 0 light, 4 dark
    const result = computeColorBalance([0, 15]);
    expect(result.light).toBe(4);
    expect(result.dark).toBe(4);
    expect(result.delta).toBe(0);
    expect(result.magnitudeRatio).toBe(0);
    expect(result.perDropCumulative).toEqual([4, 0]);
  });

  it('produces a running cumulative delta', () => {
    // Three all-light spawns: delta should grow by 4 each time
    const result = computeColorBalance([0, 0, 0]);
    expect(result.perDropCumulative).toEqual([4, 8, 12]);
    expect(result.delta).toBe(12);
    expect(result.light).toBe(12);
    expect(result.dark).toBe(0);
    expect(result.magnitudeRatio).toBe(1);
  });

  it('computes magnitudeRatio for mixed input', () => {
    // Pattern 1 = [[1,1],[1,2]] -> 3 light, 1 dark
    // Pattern 12 = [[2,2],[1,1]] -> 2 light, 2 dark
    const result = computeColorBalance([1, 12]);
    // light: 3+2=5, dark: 1+2=3, delta: 2, total: 8
    expect(result.light).toBe(5);
    expect(result.dark).toBe(3);
    expect(result.delta).toBe(2);
    expect(result.magnitudeRatio).toBeCloseTo(0.25);
  });
});
