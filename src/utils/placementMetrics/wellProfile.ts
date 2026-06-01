import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { GameBoard } from '@/types/game';

import type { WellProfile } from './types';

const DEFAULT_DEEP_WELL_THRESHOLD = 3;

/**
 * Surface roughness of the stack. A 1-wide column can never form a 2x2 by
 * itself and a deep narrow well cannot be filled before the sweep arrives, so
 * deep wells and high bumpiness are the measurable form of "don't build narrow
 * towers / gaps". Walls count as full-height neighbours, so an edge gap beside
 * a tall stack is a real well.
 */
export function computeWellProfile(
  board: GameBoard,
  deepWellThreshold: number = DEFAULT_DEEP_WELL_THRESHOLD
): WellProfile {
  const heights = columnHeights(board);

  let bumpiness = 0;
  for (let x = 0; x < BOARD_WIDTH - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1]);
  }

  let maxWellDepth = 0;
  let deepWellCount = 0;
  for (let x = 0; x < BOARD_WIDTH; x++) {
    const left = x === 0 ? BOARD_HEIGHT : heights[x - 1];
    const right = x === BOARD_WIDTH - 1 ? BOARD_HEIGHT : heights[x + 1];
    const depth = Math.max(0, Math.min(left, right) - heights[x]);
    if (depth > maxWellDepth) {
      maxWellDepth = depth;
    }
    if (depth >= deepWellThreshold) {
      deepWellCount += 1;
    }
  }

  return { heights, bumpiness, maxWellDepth, deepWellCount };
}

function columnHeights(board: GameBoard): number[] {
  const heights: number[] = [];
  for (let x = 0; x < BOARD_WIDTH; x++) {
    let height = 0;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y][x] !== 0) {
        height = BOARD_HEIGHT - y;
        break;
      }
    }
    heights.push(height);
  }
  return heights;
}
