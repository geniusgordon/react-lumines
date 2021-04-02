import { createEmptyGrid } from './grid';
import { Color, Cell, Grid, GridIndex } from './types';

export type CellInput = [number, number, Color, GridIndex?, Boolean?];

export function createGridWithCells(
  col: number,
  row: number,
  cells: CellInput[],
): Grid {
  const grid = createEmptyGrid(col, row);
  cells.forEach(([col, row, color, matchedBlock, scanned]) => {
    const c: Cell = {
      color,
      col,
      row,
    };
    if (matchedBlock !== undefined) {
      c.matchedBlock = matchedBlock;
    }
    if (matchedBlock !== undefined) {
      c.scanned = scanned;
    }
    grid[col][row] = c;
  });
  return grid;
}

function transpose<T>(m: T[][]): T[][] {
  return m[0].map((x, i) => m.map(x => x[i]));
}

export function printGrid(grid: Grid): void {
  const g = grid.map(col =>
    col.map(cell => {
      if (!cell) {
        return null;
      }
      return [
        cell.color === Color.LIGHT ? 'Light' : 'Dark',
        JSON.stringify(cell.matchedBlock),
        !!cell.scanned,
      ].join(' ');
    }),
  );
  console.table(transpose(g));
}
