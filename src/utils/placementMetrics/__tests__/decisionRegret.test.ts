import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { Block, CellValue, GameBoard } from '@/types/game';

import { computeDecisionRegret } from '../decisionRegret';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

function lightBlock(): Block {
  return {
    pattern: [
      [1, 1],
      [1, 1],
    ],
    id: 'test',
    patternIndex: 0,
  };
}

describe('computeDecisionRegret', () => {
  it('has zero regret when the chosen column already maximizes windows', () => {
    // A light pair sitting at the bottom of columns 4-5; dropping the all-light
    // block there completes a 2x2 (and extends), which is optimal.
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1][4] = 1;
    board[BOARD_HEIGHT - 1][5] = 1;
    const r = computeDecisionRegret(board, [], lightBlock(), 4);
    expect(r.regret).toBe(0);
    expect(r.chosenWindows).toBe(r.bestWindows);
  });

  it('reports positive regret when a better column was available', () => {
    // Existing light pair at columns 4-5 bottom. Choosing far-away column 0
    // builds no shared window; column 4 would complete one.
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1][4] = 1;
    board[BOARD_HEIGHT - 1][5] = 1;
    const r = computeDecisionRegret(board, [], lightBlock(), 0);
    expect(r.bestWindows).toBeGreaterThan(r.chosenWindows);
    expect(r.regret).toBeGreaterThan(0);
    expect(r.bestX).toBe(4);
  });
});
