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

export function isFreeBelowCord(grid: Grid, cord: Cord): Boolean {
  const col = xyToColRow(cord.x);
  const row = xyToColRow(cord.y);
  const column = grid[col];
  if (row + 1 < column.length) {
    return column[row + 1] === null;
  }
  return false;
}
