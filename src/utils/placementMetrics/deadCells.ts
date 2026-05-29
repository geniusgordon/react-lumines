import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard, Position } from '@/types/game';

import type { DeadCellsResult } from './types';

/**
 * Returns the set of filled cells that cannot possibly participate in a
 * monochrome 2x2 rectangle — the Lumines analogue of Tetris holes.
 *
 * A cell at (x, y) is alive iff at least one of the up-to-four 2x2
 * windows that contain (x, y) has every cell either equal to the
 * target colour or empty. Otherwise it is dead.
 */
export function computeDeadCells(board: GameBoard): DeadCellsResult {
  const cells: Position[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const color = board[y][x];
      if (color === 0) {
        continue;
      }

      if (!isCellAlive(board, x, y, color)) {
        cells.push({ x, y });
      }
    }
  }

  return { count: cells.length, cells };
}

/**
 * A 2x2 window is identified by its top-left corner (wx, wy). The four
 * windows containing (x, y) have top-left corners (x-1, y-1), (x, y-1),
 * (x-1, y), (x, y). Windows that extend off-board are skipped.
 */
function isCellAlive(
  board: GameBoard,
  x: number,
  y: number,
  color: CellValue
): boolean {
  for (const wx of [x - 1, x]) {
    for (const wy of [y - 1, y]) {
      if (wx < 0 || wy < 0) {
        continue;
      }
      if (wx + 1 >= BOARD_WIDTH || wy + 1 >= BOARD_HEIGHT) {
        continue;
      }
      if (windowCanClose(board, wx, wy, color)) {
        return true;
      }
    }
  }
  return false;
}

function windowCanClose(
  board: GameBoard,
  wx: number,
  wy: number,
  color: CellValue
): boolean {
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const c = board[wy + dy][wx + dx];
      if (c !== 0 && c !== color) {
        return false;
      }
    }
  }
  return true;
}
