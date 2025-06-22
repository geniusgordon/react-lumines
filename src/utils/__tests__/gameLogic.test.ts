import { describe, it, expect, beforeEach } from 'vitest';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type { Block, GameBoard, CellValue } from '@/types/game';

import {
  createEmptyBoard,
  rotateBlockPattern,
  getRotatedPattern,
  isValidPosition,
  placeBlockOnBoard,
  findDropPosition,
  generateRandomBlock,
  clearSquaresAndApplyGravity,
  applyGravity,
  copyBoard,
  detectPatterns,
  canPlaceAnyPartOfBlock,
} from '../gameLogic';
import { SeededRNG } from '../seededRNG';

describe('Game Logic', () => {
  describe('Board operations', () => {
    it('should create empty board with correct dimensions', () => {
      const board = createEmptyBoard();
      expect(board).toHaveLength(BOARD_HEIGHT);
      expect(board[0]).toHaveLength(BOARD_WIDTH);

      // All cells should be empty (0)
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          expect(board[y][x]).toBe(0);
        }
      }
    });

    it('should copy board correctly', () => {
      const board = createEmptyBoard();
      board[1][1] = 1;
      board[2][2] = 2;

      const copy = copyBoard(board);
      expect(copy).toEqual(board);

      // Ensure it's a deep copy
      copy[3][3] = 1;
      expect(board[3][3]).toBe(0);
    });
  });

  describe('Block rotation', () => {
    it('should rotate 2x2 pattern clockwise', () => {
      const pattern: CellValue[][] = [
        [1, 2],
        [0, 1],
      ];

      const rotated = rotateBlockPattern(pattern, true);
      const expected: CellValue[][] = [
        [0, 1],
        [1, 2],
      ];

      expect(rotated).toEqual(expected);
    });

    it('should rotate 2x2 pattern counter-clockwise', () => {
      const pattern: CellValue[][] = [
        [1, 2],
        [0, 1],
      ];

      const rotated = rotateBlockPattern(pattern, false);
      const expected: CellValue[][] = [
        [2, 1],
        [1, 0],
      ];

      expect(rotated).toEqual(expected);
    });

    it('should get rotated pattern for block', () => {
      const block: Block = {
        pattern: [
          [1, 2],
          [0, 1],
        ] as CellValue[][],
        rotation: 0,
        id: 'test',
      };

      const rotated = getRotatedPattern(block, 1);
      const expected: CellValue[][] = [
        [0, 1],
        [1, 2],
      ];

      expect(rotated).toEqual(expected);
    });
  });

  describe('Position validation', () => {
    let board: GameBoard;
    let block: Block;

    beforeEach(() => {
      board = createEmptyBoard();
      block = {
        pattern: [
          [1, 1],
          [1, 1],
        ],
        rotation: 0,
        id: 'test',
      };
    });

    it('should validate valid positions', () => {
      expect(isValidPosition(board, block, { x: 0, y: 0 })).toBe('valid');
      expect(isValidPosition(board, block, { x: 7, y: 4 })).toBe('valid');
      expect(isValidPosition(board, block, { x: 14, y: 8 })).toBe('valid');
    });

    it('should detect out of bounds positions', () => {
      expect(isValidPosition(board, block, { x: -1, y: 0 })).toBe(
        'out_of_bounds'
      );
      expect(isValidPosition(board, block, { x: 15, y: 0 })).toBe(
        'out_of_bounds'
      );
      // Negative y is now allowed (above board), only test horizontal bounds
      expect(isValidPosition(board, block, { x: 0, y: 9 })).toBe(
        'out_of_bounds'
      );
    });

    it('should detect collisions with existing blocks', () => {
      board[1][1] = 2;
      expect(isValidPosition(board, block, { x: 0, y: 0 })).toBe('collision');
    });

    it('should validate with rotation', () => {
      const tallBlock: Block = {
        pattern: [
          [1, 2],
          [0, 1],
        ],
        rotation: 0,
        id: 'tall',
      };

      expect(isValidPosition(board, tallBlock, { x: 0, y: 0 }, 1)).toBe(
        'valid'
      );
    });
  });

  describe('Block placement', () => {
    let board: GameBoard;
    let block: Block;

    beforeEach(() => {
      board = createEmptyBoard();
      block = {
        pattern: [
          [1, 2],
          [1, 2],
        ],
        rotation: 0,
        id: 'test',
      };
    });

    it('should find correct drop position', () => {
      board[8][5] = 1; // Obstacle at bottom

      const dropPos = findDropPosition(board, block, { x: 5, y: 0 });
      expect(dropPos).toEqual({ x: 5, y: 6 }); // Should stop above obstacle
    });

    it('should drop to bottom when no obstacles', () => {
      const dropPos = findDropPosition(board, block, { x: 5, y: 0 });
      expect(dropPos).toEqual({ x: 5, y: 8 }); // Bottom of board
    });
  });

  describe('Random block generation', () => {
    it('should generate deterministic blocks', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const block1 = generateRandomBlock(rng1);
      const block2 = generateRandomBlock(rng2);

      expect(block1.pattern).toEqual(block2.pattern);
      expect(block1.id).toBe(block2.id);
    });

    it('should generate valid blocks', () => {
      const rng = new SeededRNG(12345);

      for (let i = 0; i < 50; i++) {
        const block = generateRandomBlock(rng);

        expect(block.pattern).toHaveLength(2);
        expect(block.pattern[0]).toHaveLength(2);
        expect(block.rotation).toBe(0);
        expect(block.id).toHaveLength(8);

        // Pattern should contain valid cell values
        for (let y = 0; y < 2; y++) {
          for (let x = 0; x < 2; x++) {
            expect([1, 2]).toContain(block.pattern[y][x]);
          }
        }
      }
    });
  });

  describe('Square detection', () => {
    let board: GameBoard;

    beforeEach(() => {
      board = createEmptyBoard();
    });

    it('should detect 2x2 square', () => {
      // Create 2x2 square of light blocks
      board[5][5] = 1;
      board[5][6] = 1;
      board[6][5] = 1;
      board[6][6] = 1;

      const patterns = detectPatterns(board);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        x: 5,
        y: 5,
        color: 1,
      });
    });

    it('should detect 3x2 pattern (overlapping 2x2s)', () => {
      // Create 3x2 pattern
      board[5][5] = 1;
      board[5][6] = 1;
      board[5][7] = 1;
      board[6][5] = 1;
      board[6][6] = 1;
      board[6][7] = 1;

      const patterns = detectPatterns(board);

      // Should detect 2 overlapping 2x2 patterns
      expect(patterns).toHaveLength(2);
      expect(patterns).toContainEqual({
        x: 5,
        y: 5,
        color: 1,
      });
      expect(patterns).toContainEqual({
        x: 6,
        y: 5,
        color: 1,
      });
    });

    it('should detect L shape overlapping squares', () => {
      board[5][5] = 1;
      board[5][6] = 1;
      board[5][7] = 1;
      board[6][5] = 1;
      board[6][6] = 1;
      board[6][7] = 1;
      board[7][6] = 1;
      board[7][7] = 1;

      // TODO
    });

    it('should detect multiple squares', () => {
      // Square 1
      board[1][1] = 1;
      board[1][2] = 1;
      board[2][1] = 1;
      board[2][2] = 1;

      // Square 2
      board[5][5] = 2;
      board[5][6] = 2;
      board[6][5] = 2;
      board[6][6] = 2;

      const patterns = detectPatterns(board);

      expect(patterns).toHaveLength(2);
      expect(patterns).toContainEqual({
        x: 1,
        y: 1,
        color: 1,
      });
      expect(patterns).toContainEqual({
        x: 5,
        y: 5,
        color: 2,
      });
    });

    it('should not detect non-square shapes', () => {
      // L-shape (not a square)
      board[3][3] = 1;
      board[3][4] = 1;
      board[4][3] = 1;

      const patterns = detectPatterns(board);

      expect(patterns).toHaveLength(0);
    });

    it('should ignore squares smaller than 2x2', () => {
      // Single cell
      board[3][3] = 1;

      const patterns = detectPatterns(board);

      expect(patterns).toHaveLength(0);
    });

    it('should ignore empty cells and marked cells', () => {
      // Create a pattern with marked cells (should be ignored)
      board[3][3] = -1; // marked
      board[3][4] = -1; // marked
      board[4][3] = -1; // marked
      board[4][4] = -1; // marked

      // Create a pattern with empty cells (should be ignored)
      board[6][6] = 0; // empty
      board[6][7] = 0; // empty
      board[7][6] = 0; // empty
      board[7][7] = 0; // empty

      const patterns = detectPatterns(board);

      expect(patterns).toHaveLength(0);
    });

    it('should return empty array for empty board', () => {
      const patterns = detectPatterns(board);

      expect(patterns).toHaveLength(0);
    });
  });

  describe('Gravity and clearing', () => {
    let board: GameBoard;

    beforeEach(() => {
      board = createEmptyBoard();
    });

    it('should apply gravity correctly', () => {
      board[5][3] = 1;
      board[7][3] = 2;
      board[2][5] = 1;

      const newBoard = applyGravity(board);

      // Column 3: blocks should fall to bottom
      expect(newBoard[8][3]).toBe(1); // Was at 7, now at bottom
      expect(newBoard[9][3]).toBe(2); // Was at 5, now at bottom
      expect(newBoard[5][3]).toBe(0); // Original position cleared
      expect(newBoard[7][3]).toBe(0); // Original position cleared

      // Column 5: single block should fall
      expect(newBoard[9][5]).toBe(1);
      expect(newBoard[2][5]).toBe(0);
    });

    it('should apply gravity in complex scenarios with gaps', () => {
      // Create a state with complex floating blocks pattern
      board[4][3] = 1; // Stack of blocks
      board[5][3] = 2;
      board[6][3] = 1;
      board[8][3] = 2; // Gap, these should fall down
      board[2][7] = 1; // Isolated floating block

      /*
       * Board layout (showing only relevant columns):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . 1 . .  ← isolated floating block
       * 3   . . . . . . . . . .
       * 4   . . . 1 . . . . . .  ← top of stack
       * 5   . . . 2 . . . . . .  ← middle of stack
       * 6   . . . 1 . . . . . .  ← bottom of stack
       * 7   . . . . . . . . . .  ← empty gap
       * 8   . . . 2 . . . . . .  ← floating block (will fall)
       * 9   . . . . . . . . . .  ← ground level
       */

      const newBoard = applyGravity(board);

      /*
       * Expected result after gravity:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . . . .
       * 3   . . . . . . . . . .
       * 4   . . . . . . . . . .
       * 5   . . . . . . . . . .
       * 6   . . . 1 . . . . . .  ← stack bottom (was at row 4)
       * 7   . . . 2 . . . . . .  ← stack middle (was at row 5)
       * 8   . . . 1 . . . . . .  ← stack bottom (was at row 6)
       * 9   . . . 2 . . . 1 . .  ← floating block fell + isolated block fell
       */
      expect(newBoard[6][3]).toBe(1); // Bottom of stack
      expect(newBoard[7][3]).toBe(2);
      expect(newBoard[8][3]).toBe(1);
      expect(newBoard[9][3]).toBe(2); // Blocks fell to fill the gap
      expect(newBoard[9][7]).toBe(1); // Isolated block fell to bottom

      // Original positions should be cleared
      expect(newBoard[4][3]).toBe(0);
      expect(newBoard[5][3]).toBe(0);
      expect(newBoard[6][3]).toBe(1); // This one stayed in place (already at bottom of stack)
      expect(newBoard[2][7]).toBe(0);
    });

    it('should handle gravity with multiple columns', () => {
      // Create floating blocks in multiple columns
      board[3][1] = 1;
      board[6][1] = 2;
      board[2][5] = 2;
      board[4][5] = 1;
      board[7][5] = 1;
      board[1][9] = 1;

      const newBoard = applyGravity(board);

      // Column 1: two blocks should stack at bottom
      expect(newBoard[8][1]).toBe(1); // Was at 6
      expect(newBoard[9][1]).toBe(2); // Was at 3
      expect(newBoard[3][1]).toBe(0); // Original position cleared
      expect(newBoard[6][1]).toBe(0); // Original position cleared

      // Column 5: three blocks should stack at bottom
      expect(newBoard[7][5]).toBe(2); // Was at 2
      expect(newBoard[8][5]).toBe(1); // Was at 4
      expect(newBoard[9][5]).toBe(1); // Was at 7, already at bottom
      expect(newBoard[2][5]).toBe(0); // Original position cleared
      expect(newBoard[4][5]).toBe(0); // Original position cleared

      // Column 9: single block should fall to bottom
      expect(newBoard[9][9]).toBe(1);
      expect(newBoard[1][9]).toBe(0); // Original position cleared
    });

    it('should preserve stacked blocks correctly', () => {
      // Create a tower of blocks that are already properly stacked
      board[7][4] = 1;
      board[8][4] = 2;
      board[9][4] = 1;

      const newBoard = applyGravity(board);

      // Should remain in the same positions since they're already stacked
      expect(newBoard[7][4]).toBe(1);
      expect(newBoard[8][4]).toBe(2);
      expect(newBoard[9][4]).toBe(1);
    });

    it('should handle empty board', () => {
      const newBoard = applyGravity(board);

      // Should remain empty
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          expect(newBoard[y][x]).toBe(0);
        }
      }
    });

    it('should clear squares and apply gravity', () => {
      // Create floating blocks above a square
      board[2][5] = 1;
      board[3][5] = 2;

      // Create square that will be cleared
      board[7][5] = 1;
      board[7][6] = 1;
      board[8][5] = 1;
      board[8][6] = 1;

      const squares = [
        {
          x: 5,
          y: 7,
          color: 1 as CellValue,
        },
      ];

      const { newBoard, clearedCells } = clearSquaresAndApplyGravity(
        board,
        squares
      );

      expect(clearedCells).toBe(4);

      // Square should be cleared
      expect(newBoard[7][5]).toBe(0);
      expect(newBoard[8][6]).toBe(0);

      // Floating blocks should fall
      expect(newBoard[8][5]).toBe(1); // Was at 3, fell down
      expect(newBoard[9][5]).toBe(2); // Was at 2, fell to bottom
    });
  });

  describe('Game Over Logic', () => {
    it('should allow partial placement when only one column has space', () => {
      const board = createEmptyBoard();

      // Fill column 1 but leave column 0 empty
      board[0][1] = 1;
      board[1][1] = 1;

      const block: Block = {
        pattern: [
          [2, 2],
          [2, 2],
        ],
        rotation: 0,
        id: 'test',
      };

      // Try to place block at position (0, 0) - column 0 is free, column 1 is blocked
      const newBoard = placeBlockOnBoard(board, block, {
        x: 0,
        y: 0,
      });

      // Should place only the cells that fit (2 cells in column 0)
      expect(newBoard[0][0]).toBe(2); // New block placed
      expect(newBoard[1][0]).toBe(2); // New block placed
      expect(newBoard[0][1]).toBe(1); // Original block remains (collision avoided)
      expect(newBoard[1][1]).toBe(1); // Original block remains (collision avoided)
    });

    it('should trigger game over only when no placement is possible', () => {
      const board = createEmptyBoard();

      // Fill most of the board but leave one space
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 16; x++) {
          if (!(x === 15 && y === 0)) {
            board[y][x] = 1;
          }
        }
      }

      // Should not be game over since partial placement is still possible
      expect(canPlaceAnyPartOfBlock(board, { x: 14, y: 0 })).toBe(true);
    });

    it('should detect true game over when no cells can be placed', () => {
      const board = createEmptyBoard();

      // Fill the top rows to make spawning impossible
      // This simulates a realistic game over where blocks have stacked too high
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 16; x++) {
          board[y][x] = 1;
        }
      }

      // With top 3 rows filled and spawn at y=-2, no visible part can be placed
      expect(canPlaceAnyPartOfBlock(board, { x: 14, y: 0 })).toBe(false);
    });
  });
});
