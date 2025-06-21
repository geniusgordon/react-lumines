/**
 * Game Logic - Core game mechanics for Lumines
 */

import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BLOCK_PATTERNS,
} from '@/constants/gameConfig';
import type {
  GameBoard,
  Block,
  Position,
  CellValue,
  Rectangle,
  BlockPattern,
  Rotation,
  ValidMove,
} from '@/types/game';

import { SeededRNG } from './seededRNG';

/**
 * Create empty game board
 */
export function createEmptyBoard(): GameBoard {
  return Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0));
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
 * Get block pattern after rotation
 */
export function getRotatedPattern(
  block: Block,
  rotation: Rotation
): BlockPattern {
  let pattern = block.pattern;
  const rotations = (rotation - block.rotation + 4) % 4;

  for (let i = 0; i < rotations; i++) {
    pattern = rotateBlockPattern(pattern, true);
  }

  return pattern;
}

/**
 * Check if position is valid for block placement
 */
export function isValidPosition(
  board: GameBoard,
  block: Block,
  position: Position,
  rotation?: Rotation
): ValidMove {
  const pattern =
    rotation !== undefined ? getRotatedPattern(block, rotation) : block.pattern;

  // Check bounds
  if (
    position.x < 0 ||
    position.x + pattern[0].length > BOARD_WIDTH ||
    position.y < 0 ||
    position.y + pattern.length > BOARD_HEIGHT
  ) {
    return 'out_of_bounds';
  }

  // Check collision with existing blocks
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      if (pattern[y][x] !== 0) {
        const boardX = position.x + x;
        const boardY = position.y + y;

        if (board[boardY][boardX] !== 0) {
          return 'collision';
        }
      }
    }
  }

  return 'valid';
}

/**
 * Place block on board (does not modify original board)
 */
export function placeBlockOnBoard(
  board: GameBoard,
  block: Block,
  position: Position,
  rotation?: Rotation
): GameBoard {
  const newBoard = board.map(row => [...row]);
  const pattern =
    rotation !== undefined ? getRotatedPattern(block, rotation) : block.pattern;

  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      if (pattern[y][x] !== 0) {
        const boardX = position.x + x;
        const boardY = position.y + y;
        newBoard[boardY][boardX] = pattern[y][x];
      }
    }
  }

  return newBoard;
}

/**
 * Find lowest valid position for hard drop
 */
export function findDropPosition(
  board: GameBoard,
  block: Block,
  position: Position
): Position {
  let dropY = position.y;

  while (dropY < BOARD_HEIGHT) {
    const testPos = { x: position.x, y: dropY + 1 };
    if (isValidPosition(board, block, testPos) === 'valid') {
      dropY++;
    } else {
      break;
    }
  }

  return { x: position.x, y: dropY };
}

/**
 * Generate random block using seeded RNG
 */
export function generateRandomBlock(rng: SeededRNG): Block {
  const pattern = rng.choice(BLOCK_PATTERNS) as BlockPattern;

  return {
    pattern,
    rotation: 0,
    id: rng.generateId(),
  };
}

/**
 * Detect rectangles of same color on the board
 */
export function detectRectangles(board: GameBoard): Rectangle[] {
  const rectangles: Rectangle[] = [];
  const visited = Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(false));

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (!visited[y][x] && board[y][x] !== 0) {
        const rectangle = floodFillRectangle(board, visited, x, y, board[y][x]);
        if (rectangle && rectangle.width >= 2 && rectangle.height >= 2) {
          rectangles.push(rectangle);
        }
      }
    }
  }

  return rectangles;
}

/**
 * Flood fill to find connected rectangle of same color
 */
function floodFillRectangle(
  board: GameBoard,
  visited: boolean[][],
  startX: number,
  startY: number,
  color: CellValue
): Rectangle | null {
  const cells: Position[] = [];
  const stack: Position[] = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    if (
      x < 0 ||
      x >= BOARD_WIDTH ||
      y < 0 ||
      y >= BOARD_HEIGHT ||
      visited[y][x] ||
      board[y][x] !== color
    ) {
      continue;
    }

    visited[y][x] = true;
    cells.push({ x, y });

    // Add adjacent cells
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  if (cells.length === 0) {
    return null;
  }

  // Calculate bounding rectangle
  const minX = Math.min(...cells.map(c => c.x));
  const maxX = Math.max(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  const maxY = Math.max(...cells.map(c => c.y));

  // Check if it forms a solid rectangle
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (cells.length !== width * height) {
    return null; // Not a solid rectangle
  }

  return {
    x: minX,
    y: minY,
    width,
    height,
    color,
  };
}

/**
 * Clear rectangles from board and apply gravity (original function for backwards compatibility)
 */
export function clearRectanglesAndApplyGravity(
  board: GameBoard,
  rectangles: Rectangle[]
): { newBoard: GameBoard; clearedCells: number } {
  let newBoard = board.map(row => [...row]);
  let clearedCells = 0;

  // Clear rectangles
  for (const rect of rectangles) {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (newBoard[y][x] !== 0) {
          newBoard[y][x] = 0;
          clearedCells++;
        }
      }
    }
  }

  // Apply gravity
  newBoard = applyGravity(newBoard);

  return { newBoard, clearedCells };
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

/**
 * Calculate score for cleared rectangles
 * Score based on overlapping 2×2 rectangles that can fit within each rectangle
 * Formula: (width - 1) × (height - 1) for rectangles ≥ 2×2
 */
export function calculateScore(rectangles: Rectangle[]): number {
  if (rectangles.length === 0) {
    return 0;
  }

  let totalPoints = 0;

  for (const rect of rectangles) {
    // Count overlapping 2×2 rectangles that fit within this rectangle
    // For a W×H rectangle, you can fit (W-1) × (H-1) overlapping 2×2 rectangles
    if (rect.width >= 2 && rect.height >= 2) {
      const points = (rect.width - 1) * (rect.height - 1);
      totalPoints += points;
    }
    // Rectangles smaller than 2×2 shouldn't exist in Lumines, but handle gracefully
  }

  return totalPoints;
}

/**
 * Check if game is over (top row has blocks)
 */
export function isGameOver(board: GameBoard): boolean {
  return board[0].some(cell => cell !== 0);
}

/**
 * Create a copy of game board
 */
export function copyBoard(board: GameBoard): GameBoard {
  return board.map(row => [...row]);
}
