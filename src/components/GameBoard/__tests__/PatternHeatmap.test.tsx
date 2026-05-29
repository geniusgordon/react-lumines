import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import { PatternHeatmap } from '../PatternHeatmap';

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
}

describe('PatternHeatmap', () => {
  it('renders no dead-cell overlays for an empty board', () => {
    const { container } = render(
      <PatternHeatmap detectedPatterns={[]} board={emptyBoard()} />
    );
    expect(container.querySelectorAll('[data-testid="dead-cell"]').length).toBe(
      0
    );
  });

  it('renders a dead-cell overlay for each isolated colour-trapped cell', () => {
    // Light cell in bottom-right corner trapped by dark on all neighbours.
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1][BOARD_WIDTH - 1] = 1;
    board[BOARD_HEIGHT - 1][BOARD_WIDTH - 2] = 2;
    board[BOARD_HEIGHT - 2][BOARD_WIDTH - 1] = 2;
    board[BOARD_HEIGHT - 2][BOARD_WIDTH - 2] = 2;

    const { container } = render(
      <PatternHeatmap detectedPatterns={[]} board={board} />
    );
    const overlays = container.querySelectorAll('[data-testid="dead-cell"]');
    expect(overlays.length).toBeGreaterThanOrEqual(1);
  });
});
