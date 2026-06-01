import type { Square } from '@/types/game';

import type { FocusRhythmStats, PayoutColorRecord } from './types';

/**
 * Reduce a payout's cleared cells to its dominant color and that color's share.
 * Cleared cells come from the pre-payout `markedCells` (each carries its color).
 */
export function summarizePayoutColor(markedCells: Square[]): {
  dominantColor: 1 | 2;
  dominantShare: number;
} {
  let light = 0;
  let dark = 0;
  for (const cell of markedCells) {
    if (cell.color === 1) {
      light += 1;
    } else if (cell.color === 2) {
      dark += 1;
    }
  }
  const total = light + dark;
  if (total === 0) {
    return { dominantColor: 1, dominantShare: 0 };
  }
  return {
    dominantColor: light >= dark ? 1 : 2,
    dominantShare: Math.max(light, dark) / total,
  };
}

/**
 * Aggregate per-payout color records into the three sub-claims of "focus one
 * color per round": purity (each payout is mostly one color), alternation (the
 * dominant color flips round to round), and hand-off (the residual after a
 * payout leans the OTHER color, seeding the next round). light(1) contributes
 * +1 to board balance delta, so a good hand-off is: cleared light -> delta<0,
 * cleared dark -> delta>0.
 */
export function computeFocusRhythm(
  records: PayoutColorRecord[]
): FocusRhythmStats {
  if (records.length === 0) {
    return {
      payoutCount: 0,
      meanPurity: 0,
      alternationRate: 0,
      handoffRate: 0,
    };
  }

  const meanPurity =
    records.reduce((s, r) => s + r.dominantShare, 0) / records.length;

  let flips = 0;
  for (let i = 1; i < records.length; i++) {
    if (records[i].dominantColor !== records[i - 1].dominantColor) {
      flips += 1;
    }
  }
  const alternationRate = records.length > 1 ? flips / (records.length - 1) : 0;

  let handoffs = 0;
  for (const r of records) {
    const good =
      (r.dominantColor === 1 && r.postBalanceDelta < 0) ||
      (r.dominantColor === 2 && r.postBalanceDelta > 0);
    if (good) {
      handoffs += 1;
    }
  }
  const handoffRate = handoffs / records.length;

  return {
    payoutCount: records.length,
    meanPurity,
    alternationRate,
    handoffRate,
  };
}
