import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import type { RegionEff, RegionEfficiencyResult } from './types';

/**
 * Decompose the board into 4-connected monochrome regions and, for each,
 * count the internal 2x2 windows it contains. A region's window count is
 * exactly the score it would yield if swept (see scoring in timeline.ts),
 * and efficiency = windows / cells is maximized by compact (square) regions —
 * the formal statement of "square combos beat thin rectangles".
 */
export function computeRegionEfficiency(
  board: GameBoard
): RegionEfficiencyResult {
  const seen: boolean[][] = Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => false)
  );
  const regions: RegionEff[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const color = board[y][x];
      if (color === 0 || seen[y][x]) {
        continue;
      }
      const cells = floodFill(board, seen, x, y, color);
      const windows = countWindows(cells);
      regions.push({
        color: color as 1 | 2,
        cells: cells.length,
        windows,
        efficiency: cells.length === 0 ? 0 : windows / cells.length,
      });
    }
  }

  const totalWindows = regions.reduce((s, r) => s + r.windows, 0);
  const totalCells = regions.reduce((s, r) => s + r.cells, 0);
  const meanEfficiency =
    regions.length === 0
      ? 0
      : regions.reduce((s, r) => s + r.efficiency, 0) / regions.length;

  return { regions, totalWindows, totalCells, meanEfficiency };
}

function floodFill(
  board: GameBoard,
  seen: boolean[][],
  sx: number,
  sy: number,
  color: CellValue
): Array<{ x: number; y: number }> {
  const stack = [{ x: sx, y: sy }];
  const cells: Array<{ x: number; y: number }> = [];
  seen[sy][sx] = true;

  while (stack.length > 0) {
    const { x, y } = stack.pop() as { x: number; y: number };
    cells.push({ x, y });
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) {
        continue;
      }
      if (seen[ny][nx] || board[ny][nx] !== color) {
        continue;
      }
      seen[ny][nx] = true;
      stack.push({ x: nx, y: ny });
    }
  }

  return cells;
}

/**
 * Count 2x2 windows fully inside the region. Since the region is a single
 * color and 4-connected, a 2x2 all-in-region window is a monochrome window.
 */
function countWindows(cells: Array<{ x: number; y: number }>): number {
  const inRegion = new Set(cells.map(c => `${c.x},${c.y}`));
  let windows = 0;
  for (const { x, y } of cells) {
    if (
      inRegion.has(`${x + 1},${y}`) &&
      inRegion.has(`${x},${y + 1}`) &&
      inRegion.has(`${x + 1},${y + 1}`)
    ) {
      windows += 1;
    }
  }
  return windows;
}
