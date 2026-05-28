import type { GameState } from '@/types/game';

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
 * - Score increased → holding-score payout (chapter boundary).
 * - markedCells length changed → a column was marked or cleared.
 */
export function detectSweepEvent(
  pre: GameState,
  post: GameState
): SweepEvent | null {
  const scoreDelta = post.score - pre.score;
  const payout = scoreDelta > 0;
  const markedChanged = pre.markedCells.length !== post.markedCells.length;
  const columnChanged = pre.timeline.x !== post.timeline.x;

  if (!payout && !markedChanged) {
    return null;
  }

  // clearedCells: when a clear fires, markedCells goes from N to 0.
  // when marking happens, markedCells grew by (post - pre).
  const clearedCells = payout
    ? pre.markedCells.length
    : Math.max(0, post.markedCells.length - pre.markedCells.length);

  return {
    fromX: pre.timeline.x,
    toX: columnChanged ? post.timeline.x : pre.timeline.x,
    clearedCells,
    scoreDelta,
    payout,
  };
}
