import type { GameBoard } from '@/types/game';
import {
  computeFrozenGrowth,
  computeRegionEfficiency,
  computeWellProfile,
} from '@/utils/placementMetrics';

export interface DetectorThresholds {
  sealPressure: number;
  narrowWellDepth: number;
  thinRegionCells: number;
  thinEfficiency: number;
}

export const DEFAULT_THRESHOLDS: DetectorThresholds = {
  sealPressure: 0.6,
  narrowWellDepth: 3,
  thinRegionCells: 6,
  thinEfficiency: 0.4,
};

/**
 * Translate board metrics into the player's named-pattern vocabulary so the
 * notation record reads in strategy terms. (MISSED-SQUARE is added separately
 * in notation.ts, since it needs the per-drop decision-regret value.)
 */
export function detectBoardTags(
  board: GameBoard,
  thresholds: DetectorThresholds = DEFAULT_THRESHOLDS
): string[] {
  const tags: string[] = [];

  const seal = computeFrozenGrowth(board).sealPressure;
  if (seal.light >= thresholds.sealPressure) {
    tags.push('SEALED-COLOR(L)');
  }
  if (seal.dark >= thresholds.sealPressure) {
    tags.push('SEALED-COLOR(D)');
  }

  if (computeWellProfile(board).maxWellDepth >= thresholds.narrowWellDepth) {
    tags.push('NARROW-WELL');
  }

  const thin = computeRegionEfficiency(board).regions.some(
    r =>
      r.cells >= thresholds.thinRegionCells &&
      r.efficiency < thresholds.thinEfficiency
  );
  if (thin) {
    tags.push('THIN-STACK');
  }

  return tags;
}
