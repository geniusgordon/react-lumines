import { Cord, Color, Cell, Column, Grid, GridIndex } from './types';
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
  if (!column) {
    return false;
  }
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

export function updateCell(
  grid: Grid,
  cell: Cell,
  col: number,
  row: number,
): Grid {
  if (!grid[col]) {
    return grid;
  }
  if (row < 0 || row >= grid[col].length) {
    return grid;
  }
  return [
    ...grid.slice(0, col),
    [...grid[col].slice(0, row), cell, ...grid[col].slice(row + 1)],
    ...grid.slice(col + 1),
  ];
}

export function updateCellMatchedBlock(
  grid: Grid,
  matchedBlock: GridIndex | undefined,
  col: number,
  row: number,
): Grid {
  const cell = grid?.[col]?.[row];
  if (!cell) {
    return grid;
  }
  return updateCell(grid, { ...cell, matchedBlock }, col, row);
}

export function updateMatchedBlocks(grid: Grid): Grid {
  let result = grid;
  for (let i = 0; i < grid.length - 1; i++) {
    const column = grid[i];
    for (let j = 0; j < column.length - 1; j++) {
      if (isMatch(grid, i, j)) {
        result = updateCellMatchedBlock(result, { col: i, row: j }, i, j);
        result = updateCellMatchedBlock(result, { col: i, row: j }, i + 1, j);
        result = updateCellMatchedBlock(result, { col: i, row: j }, i, j + 1);
        result = updateCellMatchedBlock(
          result,
          { col: i, row: j },
          i + 1,
          j + 1,
        );
      } else {
        const cell = result?.[i]?.[j];
        if (cell?.matchedBlock?.col === i && cell?.matchedBlock?.row === j) {
          result = updateCellMatchedBlock(result, undefined, i, j);
        }
      }
    }
  }
  return result;
}

export function scanColumn(grid: Grid): Grid {
  return grid.map(column =>
    column.map(cell =>
      cell?.matchedBlock
        ? {
            ...cell,
            scanned: true,
          }
        : cell,
    ),
  );
}
