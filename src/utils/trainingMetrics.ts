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
 * Compute the longest horizontal chain length per color using DP.
 * A chain extends to the next column if it has a pattern of the same color
 * within 1 row of the predecessor pattern's y position.
 */
export function computeChainLengths(patterns: Square[]): {
  light: number;
  dark: number;
} {
  if (patterns.length === 0) {
    return { light: 0, dark: 0 };
  }

  const byColor: Record<1 | 2, Square[]> = { 1: [], 2: [] };
  for (const p of patterns) {
    if (p.color === 1 || p.color === 2) {
      byColor[p.color].push(p);
    }
  }

  function longestChain(colorPatterns: Square[]): number {
    if (colorPatterns.length === 0) {
      return 0;
    }

    // Sort by column then row
    const sorted = [...colorPatterns].sort((a, b) =>
      a.x !== b.x ? a.x - b.x : a.y - b.y
    );

    // dp[i] = longest chain ending at pattern i
    const dp = sorted.map(() => 1);

    for (let i = 1; i < sorted.length; i++) {
      for (let j = i - 1; j >= 0; j--) {
        const colDiff = sorted[i].x - sorted[j].x;
        if (colDiff > 1) {
          break;
        } // sorted by col, can stop early
        if (colDiff === 1 && Math.abs(sorted[i].y - sorted[j].y) <= 1) {
          dp[i] = Math.max(dp[i], dp[j] + 1);
        }
      }
    }

    return Math.max(...dp);
  }

  return {
    light: longestChain(byColor[1]),
    dark: longestChain(byColor[2]),
  };
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
