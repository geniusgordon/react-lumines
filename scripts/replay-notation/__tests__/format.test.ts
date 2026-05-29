import { describe, it, expect } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { Block, CellValue, GameBoard } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import {
  formatBlockRow,
  formatBoardSnapshot,
  formatColumnHeatmapAscii,
  formatDropAnnotation,
  formatDropLine,
  formatHeader,
  formatSummaryBlock,
  formatSweepAnnotation,
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
  describe('formatBlockRow', () => {
    it('renders the current block and queue as side-by-side 2x2 grids', () => {
      const cur = makeBlock(
        [
          [2, 2],
          [1, 1],
        ],
        0
      );
      const queue = [
        makeBlock(
          [
            [1, 1],
            [1, 1],
          ],
          0
        ),
        makeBlock(
          [
            [1, 2],
            [2, 1],
          ],
          6
        ),
        makeBlock(
          [
            [2, 2],
            [2, 2],
          ],
          15
        ),
      ];
      expect(formatBlockRow(cur, queue)).toBe(
        ['cur  nxt  +2   +3', '■ ■  □ □  □ ■  ■ ■', '□ □  □ □  ■ □  ■ ■'].join(
          '\n'
        )
      );
    });

    it('labels extra queue entries beyond the preset labels', () => {
      const b = makeBlock(
        [
          [1, 1],
          [1, 1],
        ],
        0
      );
      const queue = Array.from({ length: 6 }, () => b);
      const labelRow = formatBlockRow(b, queue).split('\n')[0];
      expect(labelRow).toContain('+5');
      expect(labelRow).toContain('+6');
    });
  });

  describe('formatDropLine', () => {
    it('formats a drop line with hex column and time', () => {
      const line = formatDropLine({
        seq: 7,
        frame: 1800,
        columnX: 10, // 0xA
        sweepX: 3,
      });
      expect(line).toBe('#07  f=1800 (30.0s)  col=A-B  sweep@col=3');
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

describe('formatDropAnnotation', () => {
  it('renders PSP delta, color balance, and dead-cell count', () => {
    expect(formatDropAnnotation({ pspDelta: 2, balance: -1, dead: 3 })).toBe(
      'PSP ▲+2  bal=D1  dead=3'
    );
  });

  it('uses ▼ for negative PSP and = for zero', () => {
    expect(formatDropAnnotation({ pspDelta: -1, balance: 0, dead: 0 })).toBe(
      'PSP ▼-1  bal=0'
    );
    expect(formatDropAnnotation({ pspDelta: 0, balance: 4, dead: 0 })).toBe(
      'PSP =0  bal=L4'
    );
  });

  it('omits dead segment when zero', () => {
    expect(formatDropAnnotation({ pspDelta: 1, balance: 2, dead: 0 })).toBe(
      'PSP ▲+1  bal=L2'
    );
  });
});

describe('formatSweepAnnotation', () => {
  it('renders yield and drop ratio', () => {
    expect(
      formatSweepAnnotation({ clearedCells: 6, dropsSincePrevious: 3 })
    ).toBe('yield=6  drops=3  ratio=2.00');
  });

  it('renders ∞ ratio safely when zero drops since last payout', () => {
    expect(
      formatSweepAnnotation({ clearedCells: 4, dropsSincePrevious: 0 })
    ).toBe('yield=4  drops=0  ratio=∞');
  });
});

describe('formatColumnHeatmapAscii', () => {
  it('renders 16 buckets normalized to the max value', () => {
    const counts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
    const out = formatColumnHeatmapAscii(counts);
    const lines = out.split('\n');
    expect(lines[0]).toBe('  0 1 2 3 4 5 6 7 8 9 A B C D E F');
    // 16 glyph cells in the bar row, space-separated
    expect(lines[1].split(' ').filter(Boolean)).toHaveLength(16);
  });

  it('produces a blank row when all counts are zero', () => {
    const lines = formatColumnHeatmapAscii(new Array(16).fill(0)).split('\n');
    // 16 ▁ glyphs
    expect(lines[1]).toBe('  ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁ ▁');
  });
});

describe('formatSummaryBlock', () => {
  it('emits column heatmap, balance, dead-cell, and sweep-yield lines', () => {
    const md = formatSummaryBlock({
      columnCounts: new Array(16).fill(1),
      balance: { light: 30, dark: 26, delta: 4, magnitudeRatio: 4 / 56 },
      deadCellsFinal: 2,
      sweepYield: { total: 24, mean: 6, payouts: 4 },
    });
    expect(md).toContain('## Summary');
    expect(md).toContain('column placement heatmap:');
    expect(md).toContain('color balance: light=30 dark=26');
    expect(md).toContain('dead cells (final): 2');
    expect(md).toContain('sweep payouts: 4');
    expect(md).toContain('total yield: 24 cells');
    expect(md).toContain('mean yield/payout: 6.00');
  });
});

describe('formatHeader — analytics line', () => {
  it('appends an analytics bullet when analyticsSummary is provided', () => {
    const replay: ReplayData = {
      id: 'r',
      version: 2,
      seed: 's',
      inputs: [],
      gameConfig: { version: '1.0.0', timestamp: 0 },
      metadata: { finalScore: 100 },
    };
    const md = formatHeader(
      replay,
      {
        drops: 10,
        sweeps: 3,
        finalScore: 100,
        durationFrames: 3600,
      },
      'x.json',
      {
        peakChainLength: 7,
        peakChainFrame: 1234,
        boardEfficiency: 0.45,
        keyMoments: [{ frame: 1, scoreDelta: 5, chainLength: 2 }],
        scoreDistribution: { small: 3, medium: 2, large: 1 },
      }
    );
    expect(md).toContain('peakChain=7');
    expect(md).toContain('efficiency=45%');
    expect(md).toContain('keyMoments=1');
    expect(md).toContain('scoreDistribution=3/2/1');
  });
});
