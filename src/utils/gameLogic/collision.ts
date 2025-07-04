import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type {
  GameBoard,
  Block,
  Position,
  BlockPattern,
  ValidMove,
  FallingColumn,
} from '@/types/game';

/**
 * Check if position collides with any falling cells
 */
export function hasCollisionWithFallingColumns(
  fallingColumns: FallingColumn[],
  position: Position,
  pattern: BlockPattern
): boolean {
  // Create a set of falling cell positions for efficient lookup
  const fallingCellPositions = new Set<string>();

  for (const column of fallingColumns) {
    for (const cell of column.cells) {
      fallingCellPositions.add(`${column.x},${cell.y}`);
    }
  }

  // Check if any part of the block pattern collides with falling cells
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      if (pattern[y][x] !== 0) {
        const boardX = position.x + x;
        const boardY = position.y + y;

        // Skip positions above the board
        if (boardY < 0) {
          continue;
        }

        if (fallingCellPositions.has(`${boardX},${boardY}`)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if position is valid for block placement
 */
export function isValidPosition(
  board: GameBoard,
  block: Block,
  position: Position,
  fallingColumns: FallingColumn[]
): ValidMove {
  const pattern = block.pattern;

  // Check bounds
  if (
    position.x < 0 ||
    position.x + pattern[0].length > BOARD_WIDTH ||
    position.y < -2 ||
    position.y + pattern.length > BOARD_HEIGHT
  ) {
    return 'out_of_bounds';
  }

  // Check collision with existing blocks on the board
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      if (pattern[y][x] !== 0) {
        const boardX = position.x + x;
        const boardY = position.y + y;

        if (boardY < 0) {
          continue;
        }

        if (board[boardY][boardX] !== 0) {
          return 'collision';
        }
      }
    }
  }

  // Check collision with falling columns if provided
  if (
    fallingColumns &&
    hasCollisionWithFallingColumns(fallingColumns, position, pattern)
  ) {
    return 'collision';
  }

  return 'valid';
}
