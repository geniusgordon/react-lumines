import type { Square } from '@/types/game';

export interface ComboGroup {
  color: 1 | 2;
  patternCount: number;
  cellCount: number;
  efficiency: number; // patternCount / cellCount
}

/**
 * Compute distance of each column from the board center.
 * Center columns (7 and 8 for a 16-wide board) = 0.
 * Edge columns = 7.
 */
export function computeColumnDistances(boardWidth: number): number[] {
  const center = (boardWidth - 1) / 2; // 7.5 for 16-wide board
  // ceil(|col - center|) - 1 maps the two center columns to 0, edges to 7
  return Array.from({ length: boardWidth }, (_, col) =>
    Math.max(0, Math.ceil(Math.abs(col - center)) - 1)
  );
}

/**
 * Compute the largest connected group size per color using flood-fill.
 * Delegates to computeComboGroups for accurate connectivity.
 */
export function computeChainLengths(patterns: Square[]): {
  light: number;
  dark: number;
} {
  const groups = computeComboGroups(patterns);
  const light = Math.max(
    0,
    ...groups.filter(g => g.color === 1).map(g => g.patternCount)
  );
  const dark = Math.max(
    0,
    ...groups.filter(g => g.color === 2).map(g => g.patternCount)
  );
  return { light, dark };
}

/**
 * For each cell covered by detected patterns, count how many patterns include it.
 * Returns a Map keyed by "x,y" strings.
 */
export function computeCellContributions(
  patterns: Square[]
): Map<string, number> {
  const contributions = new Map<string, number>();

  for (const p of patterns) {
    const cells = [
      `${p.x},${p.y}`,
      `${p.x + 1},${p.y}`,
      `${p.x},${p.y + 1}`,
      `${p.x + 1},${p.y + 1}`,
    ];
    for (const key of cells) {
      contributions.set(key, (contributions.get(key) ?? 0) + 1);
    }
  }

  return contributions;
}

/**
 * Group adjacent same-color patterns into combo groups using flood fill.
 * Two patterns are adjacent if they share at least one cell (i.e., x/y differ by ≤1).
 */
export function computeComboGroups(patterns: Square[]): ComboGroup[] {
  if (patterns.length === 0) {
    return [];
  }

  const visited = new Set<number>();
  const groups: ComboGroup[] = [];

  function cellsOfPattern(p: Square): string[] {
    return [
      `${p.x},${p.y}`,
      `${p.x + 1},${p.y}`,
      `${p.x},${p.y + 1}`,
      `${p.x + 1},${p.y + 1}`,
    ];
  }

  function patternsShareCell(a: Square, b: Square): boolean {
    const aSet = new Set(cellsOfPattern(a));
    return cellsOfPattern(b).some(c => aSet.has(c));
  }

  for (let i = 0; i < patterns.length; i++) {
    if (visited.has(i)) {
      continue;
    }

    // BFS flood fill
    const queue = [i];
    const groupIndices: number[] = [];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.shift()!;
      groupIndices.push(idx);

      for (let j = 0; j < patterns.length; j++) {
        if (
          !visited.has(j) &&
          patterns[j].color === patterns[i].color &&
          patternsShareCell(patterns[idx], patterns[j])
        ) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    // Calculate group metrics
    const groupPatterns = groupIndices.map(idx => patterns[idx]);
    const uniqueCells = new Set<string>();
    for (const p of groupPatterns) {
      for (const c of cellsOfPattern(p)) {
        uniqueCells.add(c);
      }
    }

    const patternCount = groupPatterns.length;
    const cellCount = uniqueCells.size;
    groups.push({
      color: patterns[i].color as 1 | 2,
      patternCount,
      cellCount,
      efficiency: patternCount / cellCount,
    });
  }

  return groups;
}
