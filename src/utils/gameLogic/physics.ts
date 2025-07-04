import { v7 } from 'uuid';

import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TIMER_CONFIG,
} from '@/constants/gameConfig';
import type {
  GameBoard,
  Square,
  FallingColumn,
  FallingCell,
} from '@/types/game';

import { copyBoard, coordToString } from './helpers';

/**
 * Create falling cells from board
 */
export function createFallingColumns(
  board: GameBoard,
  fallingColumns: FallingColumn[]
): { newFallingColumns: FallingColumn[]; newBoard: GameBoard } {
  const newBoard = copyBoard(board);
  const newFallingColumns: FallingColumn[] = [];

  // Process each column
  for (let x = 0; x < BOARD_WIDTH; x++) {
    // Find any cells that need to fall in this column
    const fallingCells = findFallingCellsInColumn(newBoard, x);

    // Check for existing falling cells in this column
    const existingColumn = fallingColumns.find(col => col.x === x);

    // Include column if it has new falling cells OR existing falling cells
    if (fallingCells.length > 0 || existingColumn) {
      // Merge with any existing falling cells in this column
      const mergedCells = existingColumn
        ? [...existingColumn.cells, ...fallingCells]
        : fallingCells;

      // Create new column with merged cells sorted by y position
      newFallingColumns.push({
        x,
        cells: mergedCells.sort((a, b) => b.y - a.y), // Sort bottom to top
        timer: existingColumn?.timer ?? 0,
      });
    }
  }

  return { newFallingColumns, newBoard };
}

/**
 * Find falling cells in a column
 */
export function findFallingCellsInColumn(
  board: GameBoard,
  x: number
): FallingCell[] {
  const cells: FallingCell[] = [];
  let foundGap = false;

  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    const cell = board[y][x];

    if (cell === 0) {
      foundGap = true;
    } else if (foundGap) {
      cells.push({
        id: v7(),
        y,
        color: cell,
      });
      board[y][x] = 0;
    }
  }

  return cells;
}

/**
 * Update falling columns physics
 */
export function updateFallingColumns(
  board: GameBoard,
  fallingColumns: FallingColumn[]
): { newBoard: GameBoard; newFallingColumns: FallingColumn[] } {
  const newBoard = copyBoard(board);
  const newFallingColumns: FallingColumn[] = [];

  for (const column of fallingColumns) {
    const newTimer = column.timer + 1;
    const isTimerReached = newTimer >= TIMER_CONFIG.FALLING_CELL_INTERVAL;
    const updatedCells: FallingCell[] = [];

    // Process each cell in the column
    for (const cell of column.cells) {
      const nextY = cell.y + 1;

      if (nextY >= BOARD_HEIGHT || newBoard[nextY][column.x] !== 0) {
        newBoard[cell.y][column.x] = cell.color;
        continue;
      }

      updatedCells.push({
        id: cell.id,
        y: isTimerReached ? nextY : cell.y,
        color: cell.color,
      });
    }

    // Only keep columns that still have falling cells
    if (updatedCells.length > 0) {
      newFallingColumns.push({
        x: column.x,
        cells: updatedCells,
        timer: isTimerReached ? 0 : newTimer,
      });
    }
  }

  return { newBoard, newFallingColumns };
}

/**
 * Clear marked cells from the board and apply gravity
 * Returns the new board with marked cells cleared and blocks settled
 */
export function clearMarkedCellsAndApplyGravity(
  board: GameBoard,
  markedCells: Square[],
  fallingColumns: FallingColumn[]
): { newBoard: GameBoard; newFallingColumns: FallingColumn[] } {
  // Create a copy of the board to avoid mutation
  const newBoard = copyBoard(board);

  // Create a set of positions to clear for efficient lookup
  const cellsToClear = new Set<string>();
  for (const cell of markedCells) {
    cellsToClear.add(coordToString(cell.x, cell.y));
  }

  // Clear all marked cells
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (cellsToClear.has(coordToString(x, y))) {
        newBoard[y][x] = 0;
      }
    }
  }

  return createFallingColumns(newBoard, fallingColumns);
}
