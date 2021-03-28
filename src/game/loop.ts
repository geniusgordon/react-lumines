import { nextBlockY, nextScanLineX } from './block';
import { xyToColRow, colRowToXY, isFreeBelow } from './grid';
import { Game, ActiveBlock, Grid, ScanLine } from './types';

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

export function loop(game: Game, elapsed: number): Game {
  return game;
}
