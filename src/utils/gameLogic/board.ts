import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type { GameBoard, CellValue } from '@/types/game';

/**
 * Create empty game board
 */
export function createEmptyBoard(): GameBoard {
  return Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0));
}

/**
 * Create a copy of game board
 */
export function copyBoard(board: GameBoard): GameBoard {
  return board.map(row => [...row]);
}

/**
 * Apply gravity to make blocks fall down
 */
export function applyGravity(board: GameBoard): GameBoard {
  const newBoard = createEmptyBoard();

  // For each column, collect non-empty cells and place them at bottom
  for (let x = 0; x < BOARD_WIDTH; x++) {
    const column: CellValue[] = [];

    // Collect non-empty cells from bottom to top
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (board[y][x] !== 0) {
        column.push(board[y][x]);
      }
    }

    // Place them at bottom of new board
    for (let i = 0; i < column.length; i++) {
      newBoard[BOARD_HEIGHT - 1 - i][x] = column[i];
    }
  }

  return newBoard;
}
