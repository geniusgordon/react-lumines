import type { GameState } from '@/types/game';
import { detectPayout } from '@/utils/placementMetrics';

export interface SweepEvent {
  fromX: number;
  toX: number;
  clearedCells: number;
  scoreDelta: number;
  payout: boolean;
}

/**
 * Detect a sweep event by diffing pre/post tick state.
 * Returns null if nothing interesting happened (silent column advance).
 *
 * Interesting events:
 * - Payout → holding-score paid out, cells cleared (chapter boundary).
 * - markedCells length changed → a column was marked or cleared.
 *
 * The payout decision is delegated to the shared `detectPayout` predicate so
 * the notation CLI and the replay analytics path never disagree on what a
 * payout is.
 */
export function detectSweepEvent(
  pre: GameState,
  post: GameState
): SweepEvent | null {
  const {
    payout,
    clearedCells: payoutCells,
    scoreDelta,
  } = detectPayout(pre, post);
  const markedChanged = pre.markedCells.length !== post.markedCells.length;
  const columnChanged = pre.timeline.x !== post.timeline.x;

  if (!payout && !markedChanged) {
    return null;
  }

  // On payout, the cleared count comes from detectPayout (markedCells N→0).
  // On a marking tick, markedCells grew by (post - pre).
  const clearedCells = payout
    ? payoutCells
    : Math.max(0, post.markedCells.length - pre.markedCells.length);

  return {
    fromX: pre.timeline.x,
    toX: columnChanged ? post.timeline.x : pre.timeline.x,
    clearedCells,
    scoreDelta,
    payout,
  };
}
