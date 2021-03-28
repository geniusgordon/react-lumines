import { nextBlockY, nextScanLineX } from './block';
import { xyToColRow, colRowToXY, isFreeBelow, updateCell } from './grid';
import { Game, ActiveBlock, DetachedBlock, Grid, ScanLine } from './types';

export function willEnterNextRow(block: ActiveBlock, elapsed: number): Boolean {
  return xyToColRow(block.y) !== xyToColRow(nextBlockY(block, elapsed));
}

export function willEnterNextColum(
  scanLine: ScanLine,
  elapsed: number,
): Boolean {
  return (
    xyToColRow(scanLine.x) !== xyToColRow(nextScanLineX(scanLine, elapsed))
  );
}

export function activeBlockWillCollide(
  block: ActiveBlock,
  grid: Grid,
): Boolean {
  const col = xyToColRow(block.x);
  const row = xyToColRow(block.y);
  return (
    !isFreeBelow(grid, { x: colRowToXY(col), y: colRowToXY(row + 1) }) ||
    !isFreeBelow(grid, { x: colRowToXY(col + 1), y: colRowToXY(row + 1) })
  );
}

export function checkDetachedBlocks(
  grid: Grid,
  detachedBlocks: DetachedBlock[],
): { grid: Grid; detachedBlocks: DetachedBlock[] } {
  let newGrid: Grid = grid;
  let newDetachedBlocks: DetachedBlock[] = [];
  detachedBlocks.forEach(b => {
    if (isFreeBelow(newGrid, b)) {
      newDetachedBlocks.push(b);
    } else {
      const col = xyToColRow(b.x);
      const row = xyToColRow(b.y);
      const cell = {
        color: b.color,
      };
      newGrid = updateCell(newGrid, cell, col, row);
    }
  });
  return { grid: newGrid, detachedBlocks: newDetachedBlocks };
}

export function loop(game: Game, elapsed: number): Game {
  return game;
}
