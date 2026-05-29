import { BLOCK_PATTERNS } from '@/constants/gameConfig';

import type { ColorBalance } from './types';

/**
 * Count light (cell value 1) vs dark (cell value 2) cells across the
 * spawn history. Pure function over a list of pattern indices.
 *
 * `perDropCumulative[i]` is `light - dark` accumulated through spawns
 * 0..i inclusive, so it can be plotted as a timeline.
 */
export function computeColorBalance(spawnedBlocks: number[]): ColorBalance {
  if (spawnedBlocks.length === 0) {
    return {
      light: 0,
      dark: 0,
      delta: 0,
      magnitudeRatio: 0,
      perDropCumulative: [],
    };
  }

  let light = 0;
  let dark = 0;
  const perDropCumulative: number[] = [];

  for (const patternIndex of spawnedBlocks) {
    const pattern = BLOCK_PATTERNS[patternIndex];
    for (const row of pattern) {
      for (const cell of row) {
        if (cell === 1) {
          light += 1;
        } else if (cell === 2) {
          dark += 1;
        }
      }
    }
    perDropCumulative.push(light - dark);
  }

  const delta = light - dark;
  const total = light + dark;
  const magnitudeRatio = total === 0 ? 0 : Math.abs(delta) / total;

  return { light, dark, delta, magnitudeRatio, perDropCumulative };
}
