import { BLOCK_PATTERNS, BOARD_WIDTH } from '@/constants/gameConfig';
import type {
  Block,
  BlockPattern,
  GameBoard,
  Position,
  FallingColumn,
} from '@/types/game';
import type { SeededRNGType } from '@/utils/seededRNG';

/**
 * Generate random block using seeded RNG
 */
export function generateRandomBlock(rng: SeededRNGType): Block {
  const pattern = rng.choice(BLOCK_PATTERNS) as BlockPattern;

  return {
    pattern,
    id: rng.generateId(),
  };
}

/**
 * Rotate a 2x2 block pattern clockwise
 */
export function rotateBlockPattern(
  pattern: BlockPattern,
  clockwise: boolean = true
): BlockPattern {
  const size = pattern.length;
  const rotated: BlockPattern = Array(size)
    .fill(null)
    .map(() => Array(size).fill(0));

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (clockwise) {
        rotated[j][size - 1 - i] = pattern[i][j];
      } else {
        rotated[size - 1 - j][i] = pattern[i][j];
      }
    }
  }

  return rotated;
}

/**
 * Calculate available spaces for block placement in a column
 */
function getAvailableSpaces(
  boardX: number,
  fallingColumns: FallingColumn[],
  board: GameBoard
): number {
  const BLOCK_HEIGHT = 2;

  // Check space blocked by falling columns
  let spacesByFalling = BLOCK_HEIGHT;
  const existingColumn = fallingColumns.find(col => col.x === boardX);
  if (existingColumn && existingColumn.cells.length > 0) {
    const topCell = existingColumn.cells[existingColumn.cells.length - 1];
    spacesByFalling = Math.min(topCell.y, BLOCK_HEIGHT);
  }

  // Check space blocked by board cells
  let spacesByBoard = 0;
  for (let y = 0; y < BLOCK_HEIGHT; y++) {
    if (board[y][boardX] === 0) {
      spacesByBoard++;
    }
  }

  return Math.min(spacesByFalling, spacesByBoard);
}

/**
 * Place block on board with partial placement support
 * Only places cells that fit within bounds and don't collide
 */
export function placeBlockOnBoard(
  board: GameBoard,
  fallingColumns: FallingColumn[],
  block: Block,
  position: Position
): GameBoard {
  const newBoard = board.map(row => [...row]);
  const pattern = block.pattern;

  if (position.y < 0) {
    const BLOCK_HEIGHT = 2;

    for (let x = 0; x < BLOCK_HEIGHT; x++) {
      const boardX = position.x + x;
      const availableSpaces = getAvailableSpaces(boardX, fallingColumns, board);

      // Place cells from bottom up, only as many as fit
      for (let y = 1; y >= BLOCK_HEIGHT - availableSpaces; y--) {
        newBoard[y - (BLOCK_HEIGHT - availableSpaces)][boardX] = pattern[y][x];
      }
    }
  } else {
    for (let y = 0; y < pattern.length; y++) {
      for (let x = 0; x < pattern[y].length; x++) {
        if (pattern[y][x] === 0) {
          continue;
        }

        const boardX = position.x + x;
        if (boardX >= 0 && boardX < BOARD_WIDTH && newBoard[y][boardX] === 0) {
          newBoard[y][boardX] = pattern[y][x];
        }
      }
    }
  }

  return newBoard;
}

/**
 * Check if any part of a block can be placed on the board
 * Returns true if at least one cell of the block can be placed
 */
export function canPlaceAnyPartOfBlock(
  board: GameBoard,
  position: Position
): boolean {
  const firstRow = board[0];
  if (firstRow[position.x] === 0 || firstRow[position.x + 1] === 0) {
    return true;
  }
  return false;
}
