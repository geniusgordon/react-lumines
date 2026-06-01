import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { CellValue, GameBoard } from '@/types/game';

import type { FrozenGrowthResult } from './types';

type ColorKey = 'light' | 'dark';

/**
 * Board-level "sealing" pressure per color. Generalizes deadCells (a cell whose
 * every window is blocked) to a continuous measure: for each color, how many
 * 2x2 windows can still close monochrome (open) vs. are contaminated by the
 * opposite color (blocked). High sealPressure means that color's combos can no
 * longer grow — the measurable form of "don't seal a color too early".
 */
export function computeFrozenGrowth(board: GameBoard): FrozenGrowthResult {
  const open = { light: 0, dark: 0 };
  const blocked = { light: 0, dark: 0 };

  for (let wy = 0; wy < BOARD_HEIGHT - 1; wy++) {
    for (let wx = 0; wx < BOARD_WIDTH - 1; wx++) {
      classifyWindow(board, wx, wy, 1, open, blocked);
      classifyWindow(board, wx, wy, 2, open, blocked);
    }
  }

  return {
    open,
    blocked,
    sealPressure: {
      light: pressure(open.light, blocked.light),
      dark: pressure(open.dark, blocked.dark),
    },
  };
}

function classifyWindow(
  board: GameBoard,
  wx: number,
  wy: number,
  color: CellValue,
  open: Record<ColorKey, number>,
  blocked: Record<ColorKey, number>
): void {
  let hasColor = false;
  let hasEmpty = false;
  let hasOpposite = false;

  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const c = board[wy + dy][wx + dx];
      if (c === 0) {
        hasEmpty = true;
      } else if (c === color) {
        hasColor = true;
      } else {
        hasOpposite = true;
      }
    }
  }

  const key: ColorKey = color === 1 ? 'light' : 'dark';
  if (hasOpposite) {
    // Contaminated: counts as blocked only if this color had a stake here.
    if (hasColor || hasEmpty) {
      blocked[key] += 1;
    }
  } else if (hasColor && hasEmpty) {
    // Partially built and still able to close monochrome.
    open[key] += 1;
  }
  // all-empty windows (no stake) and complete windows (already a combo) are ignored.
}

function pressure(open: number, blocked: number): number {
  const total = open + blocked;
  return total === 0 ? 0 : blocked / total;
}
