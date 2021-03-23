import { Cord, Color, Column, Grid } from './types';
import { Dimension } from '../constants';

export function xyToColRow(x: number): number {
  return Math.floor(x / Dimension.SQUARE_SIZE);
}
export function colRowToXY(col: number): number {
  return col * Dimension.SQUARE_SIZE;
}

export function addToColumn(colors: Color[], column: Column): Column {
  const result = [...column];

  let i = column.length - 1;
  while (i >= 0) {
    if (column[i] === null) {
      break;
    }
    i--;
  }
  let j = colors.length - 1;
  while (i >= 0 && j >= 0) {
    result[i] = {
      color: colors[j],
      matched: false,
      scanned: false,
    };
    i--;
    j--;
  }

  return result;
}

export function isFree(grid: Grid, cord: Cord): Boolean {
  const col = xyToColRow(cord.x);
  const row = xyToColRow(cord.y);
  const column = grid[col];
  if (row < column.length) {
    return column[row] === null;
  }
  return false;
}

export function isFreeBelow(grid: Grid, cord: Cord): Boolean {
  return isFree(grid, { x: cord.x, y: cord.y + Dimension.SQUARE_SIZE });
}

export function isMatch(grid: Grid, col: number, row: number): Boolean {
  const blocks = [
    grid[col][row],
    grid[col + 1][row],
    grid[col][row + 1],
    grid[col + 1][row + 1],
  ].filter(b => !!b);

  if (blocks.length !== 4) {
    return false;
  }

  const first = blocks[0];

  if (!first) {
    return false;
  }

  for (let i = 1; i < blocks.length; i++) {
    if (first.color !== blocks[i]?.color) {
      return false;
    }
  }

  return true;
}
