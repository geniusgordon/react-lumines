import { describe, it, expect } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { Block, CellValue, GameBoard } from '@/types/game';

import {
  formatBlockGlyph,
  formatBoardSnapshot,
  formatDropLine,
  formatSweepLine,
  renderBoard,
} from '../format';

function makeBlock(
  pattern: CellValue[][],
  patternIndex: number,
  id: string = 'x'
): Block {
  return { pattern: pattern as Block['pattern'], id, patternIndex };
}

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

describe('format', () => {
  describe('formatBlockGlyph', () => {
    it('renders all-light block', () => {
      expect(
        formatBlockGlyph(
          makeBlock(
            [
              [1, 1],
              [1, 1],
            ],
            0
          )
        )
      ).toBe('[□□/□□]');
    });

    it('renders all-dark block', () => {
      expect(
        formatBlockGlyph(
          makeBlock(
            [
              [2, 2],
              [2, 2],
            ],
            15
          )
        )
      ).toBe('[■■/■■]');
    });

    it('renders checkerboard block', () => {
      expect(
        formatBlockGlyph(
          makeBlock(
            [
              [1, 2],
              [2, 1],
            ],
            6
          )
        )
      ).toBe('[□■/■□]');
    });
  });

  describe('formatDropLine', () => {
    it('formats a drop line with hex column and time', () => {
      const block = makeBlock(
        [
          [1, 2],
          [2, 1],
        ],
        6
      );
      const line = formatDropLine({
        seq: 7,
        frame: 1800,
        block,
        columnX: 10, // 0xA
        sweepX: 3,
      });
      expect(line).toBe('#07  f=1800 (30.0s)  [□■/■□]  col=A-B  sweep@col=3');
    });
  });

  describe('formatSweepLine', () => {
    it('formats a payout line', () => {
      expect(
        formatSweepLine({
          fromX: 3,
          toX: 4,
          clearedCells: 6,
          scoreDelta: 400,
          payout: true,
        })
      ).toBe('>>> SWEEP col=3→4  cleared=6 cells  +400  holding→paid');
    });

    it('formats a mark-only line', () => {
      expect(
        formatSweepLine({
          fromX: 5,
          toX: 5,
          clearedCells: 4,
          scoreDelta: 0,
          payout: false,
        })
      ).toBe('... mark col=5→5  cleared=4 cells  +0');
    });
  });

  describe('renderBoard', () => {
    it('renders an empty 10x16 board with hex header', () => {
      const out = renderBoard(emptyBoard());
      const lines = out.split('\n');
      expect(lines).toHaveLength(BOARD_HEIGHT + 1);
      expect(lines[0]).toBe('   0 1 2 3 4 5 6 7 8 9 A B C D E F');
      expect(lines[1]).toBe(' 0 . . . . . . . . . . . . . . . .');
      expect(lines[10]).toBe(' 9 . . . . . . . . . . . . . . . .');
    });

    it('renders light and dark cells', () => {
      const b = emptyBoard();
      b[9][0] = 1;
      b[9][1] = 2;
      const lines = renderBoard(b).split('\n');
      expect(lines[10].startsWith(' 9 □ ■')).toBe(true);
    });
  });

  describe('formatBoardSnapshot', () => {
    it('appends timeline footer', () => {
      const out = formatBoardSnapshot({
        board: emptyBoard(),
        timelineX: 12, // 0xC
      });
      const lines = out.split('\n');
      expect(lines[lines.length - 1]).toBe('timeline@col=C');
    });
  });
});
