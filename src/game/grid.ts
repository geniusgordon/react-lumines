import { Cord, Cell, Column, Grid, GridIndex, DetachedBlock } from './types';
import { Dimension, Speed } from '../constants';

export function xyToColRow(x: number): number {
  return Math.floor(x / Dimension.SQUARE_SIZE);
}
export function colRowToXY(col: number): number {
  return col * Dimension.SQUARE_SIZE;
}

export function createEmptyGrid(
  col: number = Dimension.GRID_COLUMNS,
  row: number = Dimension.GRID_ROWS,
): Grid {
  return [...new Array(col)].map(() => [...new Array(row)].map(() => null));
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

export function getCellsInSquare(grid: Grid, col: number, row: number): Cell[] {
  return [
    grid[col]?.[row],
    grid[col]?.[row + 1],
    grid[col + 1]?.[row],
    grid[col + 1]?.[row + 1],
  ].filter(b => !!b);
}

export function isSameColor(cells: Cell[]): Boolean {
  const first = cells[0];
  if (!first) {
    return false;
  }
  for (let i = 1; i < cells.length; i++) {
    if (first.color !== cells[i]?.color) {
      return false;
    }
  }
  return true;
}

export function isMatchedBlock(cell: Cell, col: number, row: number): Boolean {
  return cell?.matchedBlock?.col === col && cell?.matchedBlock?.row === row;
}

export function isSameMatchedBlock(a?: Cell, b?: Cell): Boolean {
  if (!a || !a.matchedBlock || !b || !b.matchedBlock) {
    return false;
  }
  return (
    a.matchedBlock.col === b.matchedBlock.col &&
    a.matchedBlock.row === b.matchedBlock.row
  );
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
  for (let i = 0; i < grid.length; i++) {
    const column = grid[i];
    for (let j = 0; j < column.length; j++) {
      const cells = getCellsInSquare(result, i, j);
      if (cells.length === 4 && isSameColor(cells)) {
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
        for (let i = 0; i < cells.length; i++) {
          if (isSameMatchedBlock(grid[i][j], cells[i])) {
            const c = cells[i];
            if (c) {
              result = updateCellMatchedBlock(result, undefined, c.col, c.row);
            }
          }
        }
      }
    }
  }
  return result;
}

export function scanColumn(
  grid: Grid,
  col: number,
): { grid: Grid; matchedCount: number; scannedCount: number } {
  if (col < 0 || col >= grid.length) {
    return { grid, matchedCount: 0, scannedCount: 0 };
  }
  return {
    grid: [
      ...grid.slice(0, col),
      grid[col].map(cell =>
        cell?.matchedBlock ? { ...cell, scanned: true } : cell,
      ),
      ...grid.slice(col + 1),
    ],
    matchedCount: grid[col].filter(
      (cell, i) =>
        cell?.matchedBlock?.col === col && cell?.matchedBlock?.row === i,
    ).length,
    scannedCount: grid[col].filter((cell, i) => !!cell?.matchedBlock).length,
  };
}

export function removeScanned(
  grid: Grid,
): { grid: Grid; detachedBlocks: DetachedBlock[] } {
  const result: Grid = [];
  const detachedBlocks: DetachedBlock[] = [];

  for (let i = 0; i < grid.length; i++) {
    const column: Column = grid[i].map(() => null);
    let hasMatched = false;
    for (let j = grid[i].length - 1; j >= 0; j--) {
      const cell = grid[i][j];
      if (cell === null) {
        continue;
      }
      if (cell.scanned) {
        hasMatched = true;
      } else if (hasMatched) {
        detachedBlocks.push({
          color: cell.color,
          x: i * Dimension.SQUARE_SIZE,
          y: j * Dimension.SQUARE_SIZE,
          speed: Speed.DROP_DETACHED,
        });
      } else {
        column[j] = cell;
      }
    }
    result.push(column);
  }

  return { grid: result, detachedBlocks };
}
