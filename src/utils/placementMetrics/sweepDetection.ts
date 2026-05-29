import type { GameState } from '@/types/game';

export interface PayoutResult {
  payout: boolean; // a holding-score payout cleared marked cells this tick
  clearedCells: number; // cells cleared by the payout (0 when no payout)
  scoreDelta: number; // score gained between pre and post
}

/**
 * Single source of truth for "did a timeline-sweep payout happen this tick".
 *
 * A payout is the clear-and-score step (`clearMarkedCellsAndScore`), which is
 * the only normal-play path that empties `markedCells` — it does so while
 * adding the accumulated `holdingScore` (always > 0) to `score`. We identify
 * it by the `markedCells` non-empty → empty transition, which also yields the
 * cleared-cell count directly.
 *
 * Both the notation CLI (`detectSweepEvent`) and the replay analytics path
 * (`createSnapshotsForReplay`) call this so their notions of "payout" never
 * drift apart.
 */
export function detectPayout(pre: GameState, post: GameState): PayoutResult {
  const scoreDelta = post.score - pre.score;
  const payout = pre.markedCells.length > 0 && post.markedCells.length === 0;
  return {
    payout,
    clearedCells: payout ? pre.markedCells.length : 0,
    scoreDelta,
  };
}
