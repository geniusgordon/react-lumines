/**
 * Game Logic - Core game mechanics for Lumines
 */

import { v7 } from 'uuid';

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
  ValidMove,
  FallingColumn,
  FallingCell,
} from '@/types/game';

import type { SeededRNGType } from './seededRNG';

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

/**
 * Find lowest valid position for hard drop
 */
export function findDropPosition(
  board: GameBoard,
  block: Block,
  position: Position,
  fallingColumns: FallingColumn[]
): Position {
  let dropY = position.y;

  while (dropY < BOARD_HEIGHT) {
    const testPos = { x: position.x, y: dropY + 1 };
    if (isValidPosition(board, block, testPos, fallingColumns) === 'valid') {
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
export function generateRandomBlock(rng: SeededRNGType): Block {
  const pattern = rng.choice(BLOCK_PATTERNS) as BlockPattern;

  return {
    pattern,
    id: rng.generateId(),
  };
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
 * Create falling cells from board
 */
export function createFallingColumns(
  board: GameBoard,
  fallingColumns: FallingColumn[]
): { newFallingColumns: FallingColumn[]; newBoard: GameBoard } {
  const newBoard = board.map(row => [...row]);
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

function findFallingCellsInColumn(board: GameBoard, x: number): FallingCell[] {
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
  const markedSet = new Set<string>();

  const markCell = (x: number, y: number, color: CellValue) => {
    const cell = `${x},${y}`;
    if (!markedSet.has(cell)) {
      markedCells.push({ x, y, color });
      markedSet.add(cell);
    }
  };

  // Mark cells from patterns that start in the current column
  const currentColumnPatterns = getPatternsByLeftColumn(
    detectedPatterns,
    column
  );
  for (const pattern of currentColumnPatterns) {
    // Mark the left column of this 2x2 pattern
    markCell(pattern.x, pattern.y, pattern.color);
    markCell(pattern.x, pattern.y + 1, pattern.color);
  }

  // Mark cells from patterns that started in the previous column
  if (column > 0) {
    const previousColumnPatterns = getPatternsByLeftColumn(
      detectedPatterns,
      column - 1
    );
    for (const pattern of previousColumnPatterns) {
      // Mark the right column of this 2x2 pattern
      markCell(pattern.x + 1, pattern.y, pattern.color);
      markCell(pattern.x + 1, pattern.y + 1, pattern.color);
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
  markedCells: Square[],
  fallingColumns: FallingColumn[]
): { newBoard: GameBoard; newFallingColumns: FallingColumn[] } {
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

  return createFallingColumns(newBoard, fallingColumns);
}
