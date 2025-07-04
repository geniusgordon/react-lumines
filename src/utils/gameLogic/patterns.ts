import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type { GameBoard, Square, CellValue } from '@/types/game';

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
