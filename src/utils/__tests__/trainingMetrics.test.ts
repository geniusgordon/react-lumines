import { describe, it, expect } from 'vitest';
import {
  computeChainLengths,
  computeCellContributions,
  computeComboGroups,
  computeColumnDistances,
  type ComboGroup,
} from '@/utils/trainingMetrics';
import type { Square } from '@/types/game';

describe('computeColumnDistances', () => {
  it('returns 0 for columns 7 and 8 (center of 16-wide board)', () => {
    const distances = computeColumnDistances(16);
    expect(distances[7]).toBe(0);
    expect(distances[8]).toBe(0);
  });

  it('returns 7 for columns 0 and 15 (edges)', () => {
    const distances = computeColumnDistances(16);
    expect(distances[0]).toBe(7);
    expect(distances[15]).toBe(7);
  });

  it('returns monotonically increasing distances toward the edges', () => {
    const distances = computeColumnDistances(16);
    // Left half: distances[7] <= distances[6] <= ... <= distances[0]
    for (let col = 6; col >= 0; col--) {
      expect(distances[col]).toBeGreaterThanOrEqual(distances[col + 1]);
    }
  });
});

describe('computeChainLengths', () => {
  it('returns 0,0 for empty patterns', () => {
    const result = computeChainLengths([]);
    expect(result).toEqual({ light: 0, dark: 0 });
  });

  it('counts a horizontal chain of light patterns', () => {
    // 3 light patterns at (0,0), (1,0), (2,0) — each at y=0, consecutive columns
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 0, color: 1 },
      { x: 2, y: 0, color: 1 },
    ];
    const result = computeChainLengths(patterns);
    expect(result.light).toBe(3);
    expect(result.dark).toBe(0);
  });

  it('does not count non-adjacent patterns as a chain', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 5, y: 0, color: 1 }, // gap of 4 columns
    ];
    const result = computeChainLengths(patterns);
    expect(result.light).toBe(1);
  });

  it('counts patterns that are adjacent within 1 row (diagonal chain)', () => {
    // (0,0) → (1,1): y diff is 1, should still count as chain
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 1, color: 1 },
      { x: 2, y: 0, color: 1 },
    ];
    const result = computeChainLengths(patterns);
    expect(result.light).toBe(3);
  });
});

describe('computeCellContributions', () => {
  it('returns empty map for no patterns', () => {
    const result = computeCellContributions([]);
    expect(result.size).toBe(0);
  });

  it('counts 1 for a cell belonging to exactly 1 pattern', () => {
    const patterns: Square[] = [{ x: 0, y: 0, color: 1 }];
    const result = computeCellContributions(patterns);
    // Pattern at (0,0) covers cells (0,0), (1,0), (0,1), (1,1) — each contributes to 1 pattern
    expect(result.get('0,0')).toBe(1);
    expect(result.get('1,0')).toBe(1);
  });

  it('counts 2 for a shared edge cell between two horizontally adjacent patterns', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 }, // covers cols 0-1
      { x: 1, y: 0, color: 1 }, // covers cols 1-2 — col 1 is shared
    ];
    const result = computeCellContributions(patterns);
    // Column 1 cells are shared by both patterns
    expect(result.get('1,0')).toBe(2);
    expect(result.get('1,1')).toBe(2);
    // Column 0 is only in first pattern
    expect(result.get('0,0')).toBe(1);
    // Column 2 is only in second pattern
    expect(result.get('2,0')).toBe(1);
  });
});

describe('computeComboGroups', () => {
  it('returns empty array for no patterns', () => {
    expect(computeComboGroups([])).toHaveLength(0);
  });

  it('groups two adjacent same-color patterns as one combo', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 0, color: 1 },
    ];
    const groups = computeComboGroups(patterns);
    expect(groups).toHaveLength(1);
    expect(groups[0].patternCount).toBe(2);
    expect(groups[0].cellCount).toBe(6); // 3 cols × 2 rows
    expect(groups[0].efficiency).toBeCloseTo(2 / 6);
  });

  it('separates non-adjacent same-color patterns as different combos', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 5, y: 0, color: 1 }, // gap — not adjacent
    ];
    const groups = computeComboGroups(patterns);
    expect(groups).toHaveLength(2);
  });

  it('separates patterns of different colors into different combos', () => {
    const patterns: Square[] = [
      { x: 0, y: 0, color: 1 },
      { x: 1, y: 0, color: 2 }, // different color, adjacent
    ];
    const groups = computeComboGroups(patterns);
    expect(groups).toHaveLength(2);
  });
});
