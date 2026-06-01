import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { detectBoardTags } from '../detectors';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

function stackColumn(board: GameBoard, x: number, height: number): void {
  for (let y = BOARD_HEIGHT - 1; y >= BOARD_HEIGHT - height; y--) {
    board[y][x] = 1;
  }
}

describe('detectBoardTags', () => {
  it('emits no tags for an empty board', () => {
    expect(detectBoardTags(emptyBoard())).toEqual([]);
  });

  it('flags a deep narrow well', () => {
    const board = emptyBoard();
    stackColumn(board, 4, 6);
    stackColumn(board, 6, 6); // column 5 is a depth-6 well
    expect(detectBoardTags(board)).toContain('NARROW-WELL');
  });

  it('flags a long thin same-color region as THIN-STACK', () => {
    const board = emptyBoard();
    // a 1-tall x 8-wide light strip: many cells, zero windows -> low efficiency
    for (let x = 0; x < 8; x++) {
      board[BOARD_HEIGHT - 1][x] = 1;
    }
    expect(detectBoardTags(board)).toContain('THIN-STACK');
  });

  it('flags SEALED-COLOR when a color is hemmed in by the opposite color', () => {
    const board = emptyBoard();
    // A tight mixed cluster: every 2x2 window here mixes light and dark, so
    // both colors are "blocked" (contaminated) rather than open to grow.
    board[BOARD_HEIGHT - 1][2] = 1;
    board[BOARD_HEIGHT - 1][3] = 2;
    board[BOARD_HEIGHT - 2][2] = 2;
    board[BOARD_HEIGHT - 2][3] = 1;
    const tags = detectBoardTags(board);
    expect(tags.some(t => t.startsWith('SEALED-COLOR'))).toBe(true);
  });
});
