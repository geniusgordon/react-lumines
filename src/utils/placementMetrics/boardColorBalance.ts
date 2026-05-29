import type { GameBoard } from '@/types/game';

import type { BoardColorBalance } from './types';

/**
 * Count light (cell value 1) vs dark (cell value 2) cells currently on the
 * board. Unlike the spawn stream — which the player does not control, since
 * block colours are RNG-determined — the board's colour split is shaped by
 * where the player places blocks and what they clear, so it is a meaningful
 * signal: a board drifting heavily one colour means same-colour rectangles
 * aren't forming and clearing.
 */
export function computeBoardColorBalance(board: GameBoard): BoardColorBalance {
  let light = 0;
  let dark = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell === 1) {
        light += 1;
      } else if (cell === 2) {
        dark += 1;
      }
    }
  }

  const delta = light - dark;
  const total = light + dark;
  const magnitudeRatio = total === 0 ? 0 : Math.abs(delta) / total;

  return { light, dark, delta, magnitudeRatio };
}
