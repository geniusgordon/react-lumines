import type { SweepEvent, SweepValueStats } from './types';

/**
 * Aggregate payout VALUE (scoreDelta == 2x2-window count paid out), the unit
 * the scoring function actually rewards — distinct from computeSweepYield,
 * which aggregates cleared CELLS. Two payouts clearing equal cells can differ
 * in points by shape, so points is the primary value signal.
 */
export function computeSweepValue(events: SweepEvent[]): SweepValueStats {
  if (events.length === 0) {
    return { totalPoints: 0, meanPoints: 0 };
  }
  const totalPoints = events.reduce((s, e) => s + e.scoreDelta, 0);
  return { totalPoints, meanPoints: totalPoints / events.length };
}
