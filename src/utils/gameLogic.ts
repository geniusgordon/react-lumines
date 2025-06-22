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
  Square,
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
 * Clear squares from board and apply gravity
 */
export function clearSquaresAndApplyGravity(
  board: GameBoard,
  squares: Square[]
): { newBoard: GameBoard; clearedCells: number } {
  let newBoard = board.map(row => [...row]);
  let clearedCells = 0;

  // Clear squares
  for (const square of squares) {
    for (let y = square.y; y < square.y + 2; y++) {
      for (let x = square.x; x < square.x + 2; x++) {
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
 * Check if any part of a block can be placed on the board
 * Returns true if at least one cell of the block can be placed
 */
export function canPlaceAnyPartOfBlock(
  board: GameBoard,
  block: Block,
  position: Position,
  rotation?: Rotation
): boolean {
  const pattern =
    rotation !== undefined ? getRotatedPattern(block, rotation) : block.pattern;

  // Check if any individual cell of the block can be placed
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      if (pattern[y][x] !== 0) {
        const boardX = position.x + x;
        const boardY = position.y + y;

        // Check if this cell position is valid and not occupied
        if (
          boardX >= 0 &&
          boardX < BOARD_WIDTH &&
          boardY >= 0 &&
          boardY < BOARD_HEIGHT &&
          board[boardY][boardX] === 0
        ) {
          return true; // At least one cell can be placed
        }
      }
    }
  }

  return false; // No cells can be placed
}

/**
 * Enhanced game over check - only triggers when NO part of any block can be placed
 * Tests all possible positions and rotations for the current block
 */
export function isGameOver(board: GameBoard, block: Block): boolean {
  // Test all possible positions across the entire board
  for (let x = -1; x <= BOARD_WIDTH; x++) {
    // Test all y positions across the entire board height
    for (let y = -1; y <= BOARD_HEIGHT; y++) {
      const testPosition = { x, y };

      // Test all 4 possible rotations
      for (let rotation = 0; rotation < 4; rotation++) {
        if (
          canPlaceAnyPartOfBlock(
            board,
            block,
            testPosition,
            rotation as Rotation
          )
        ) {
          return false; // Game can continue
        }
      }
    }
  }

  return true; // No placement possible - game over
}

/**
 * Place block on board with partial placement support
 * Only places cells that fit within bounds and don't collide
 */
export function placeBlockOnBoard(
  board: GameBoard,
  block: Block,
  position: Position,
  rotation?: Rotation
): { newBoard: GameBoard; placedCells: number } {
  const newBoard = board.map(row => [...row]);
  const pattern =
    rotation !== undefined ? getRotatedPattern(block, rotation) : block.pattern;

  let placedCells = 0;

  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      if (pattern[y][x] !== 0) {
        const boardX = position.x + x;
        const boardY = position.y + y;

        // Only place if within bounds and position is empty
        if (
          boardX >= 0 &&
          boardX < BOARD_WIDTH &&
          boardY >= 0 &&
          boardY < BOARD_HEIGHT &&
          newBoard[boardY][boardX] === 0
        ) {
          newBoard[boardY][boardX] = pattern[y][x];
          placedCells++;
        }
        // Cells that can't be placed are simply discarded
      }
    }
  }

  return { newBoard, placedCells };
}

/**
 * Create a copy of game board
 */
export function copyBoard(board: GameBoard): GameBoard {
  return board.map(row => [...row]);
}

/**
 * Detect all 2x2 same-colored patterns on the board
 * Returns an array of Square objects representing detected patterns
 */
export function detectPatterns(board: GameBoard): Square[] {
  const patterns: Square[] = [];

  // Scan the board for 2x2 patterns
  // Stop at BOARD_HEIGHT-1 and BOARD_WIDTH-1 since we're checking 2x2 areas
  for (let y = 0; y < BOARD_HEIGHT - 1; y++) {
    for (let x = 0; x < BOARD_WIDTH - 1; x++) {
      const topLeft = board[y][x];

      // Skip empty cells and marked cells
      if (topLeft <= 0) {
        continue;
      }

      // Check if all 4 cells in the 2x2 area have the same color
      const topRight = board[y][x + 1];
      const bottomLeft = board[y + 1][x];
      const bottomRight = board[y + 1][x + 1];

      if (
        topLeft === topRight &&
        topLeft === bottomLeft &&
        topLeft === bottomRight &&
        topLeft > 0 // Must be a valid color (1 or 2), not empty or marked
      ) {
        patterns.push({
          x,
          y,
          color: topLeft,
        });
      }
    }
  }

  return patterns;
}

/**
 * Check if a column contains any part of detected 2x2 patterns
 * Returns the patterns that have their left edge in this column
 */
export function getPatternsByLeftColumn(
  detectedPatterns: Square[],
  column: number
): Square[] {
  return detectedPatterns.filter(pattern => pattern.x === column);
}

/**
 * Mark cells in a column for clearing by the timeline
 * This function marks cells from patterns that intersect with the given column:
 * - Patterns with left edge in current column (left half of pattern)
 * - Patterns with left edge in previous column (right half of pattern)
 */
export function markColumnCells(
  column: number,
  detectedPatterns: Square[]
): Square[] {
  const markedCells: Square[] = [];

  // Mark cells from patterns that start in the current column
  const currentColumnPatterns = getPatternsByLeftColumn(
    detectedPatterns,
    column
  );
  for (const pattern of currentColumnPatterns) {
    // Mark the left column of this 2x2 pattern
    markedCells.push(
      { x: pattern.x, y: pattern.y, color: pattern.color },
      { x: pattern.x, y: pattern.y + 1, color: pattern.color }
    );
  }

  // Mark cells from patterns that started in the previous column
  if (column > 0) {
    const previousColumnPatterns = getPatternsByLeftColumn(
      detectedPatterns,
      column - 1
    );
    for (const pattern of previousColumnPatterns) {
      // Mark the right column of this 2x2 pattern
      markedCells.push(
        { x: pattern.x + 1, y: pattern.y, color: pattern.color },
        { x: pattern.x + 1, y: pattern.y + 1, color: pattern.color }
      );
    }
  }

  return markedCells;
}

/**
 * Clear marked cells from the board and apply gravity
 * Returns the new board with marked cells cleared and blocks settled
 */
export function clearMarkedCellsAndApplyGravity(
  board: GameBoard,
  markedCells: Square[]
): GameBoard {
  // Create a copy of the board to avoid mutation
  const newBoard = board.map(row => [...row]);

  // Create a set of positions to clear for efficient lookup
  const cellsToClare = new Set<string>();
  for (const cell of markedCells) {
    cellsToClare.add(`${cell.x},${cell.y}`);
  }

  // Clear all marked cells
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (cellsToClare.has(`${x},${y}`)) {
        newBoard[y][x] = 0;
      }
    }
  }

  // Apply gravity to settle remaining blocks
  return applyGravity(newBoard);
}
