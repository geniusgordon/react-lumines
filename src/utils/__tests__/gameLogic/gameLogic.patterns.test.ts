import { describe, it, expect, beforeEach } from 'vitest';

import type { GameBoard } from '@/types/game';

import { createEmptyBoard, detectPatterns } from '../../gameLogic';

describe('Pattern Detection', () => {
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

    // TODO: Add specific expectations for L-shape detection
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

  it('should ignore empty cells', () => {
    board[6][6] = 0;
    board[6][7] = 0;
    board[7][6] = 0;
    board[7][7] = 0;

    const patterns = detectPatterns(board);

    expect(patterns).toHaveLength(0);
  });

  it('should return empty array for empty board', () => {
    const patterns = detectPatterns(board);

    expect(patterns).toHaveLength(0);
  });
});
