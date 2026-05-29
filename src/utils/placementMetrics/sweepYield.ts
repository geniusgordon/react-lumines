import type { SweepEvent, SweepYieldStats } from './types';

/**
 * Aggregate a chronological list of sweep payout events.
 * Pure function; detection of events themselves lives in the consumer.
 */
export function computeSweepYield(events: SweepEvent[]): SweepYieldStats {
  if (events.length === 0) {
    return { total: 0, mean: 0, perPayout: [] };
  }
  const total = events.reduce((sum, e) => sum + e.clearedCells, 0);
  return {
    total,
    mean: total / events.length,
    perPayout: events,
  };
}
