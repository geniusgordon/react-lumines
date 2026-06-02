import type { GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import {
  computeBoardColorBalance,
  computeDeadCells,
  computeDecisionRegret,
  computeSweepYield,
  type SweepEvent,
} from '@/utils/placementMetrics';
import { driveReplay, replayTotalFrames } from '@/utils/replaySimulation';
import {
  expandReplayDataWithSnapshots,
  getReplayBlockQueue,
} from '@/utils/replayUtils';

import { detectBoardTags } from './detectors';
import { detectSweepEvent } from './events';
import {
  formatBlockRow,
  formatBoardSnapshot,
  formatChapterHeader,
  formatDropAnnotation,
  formatDropLine,
  formatHeader,
  formatSummaryBlock,
  formatSweepAnnotation,
  formatSweepLine,
  type NotationSummary,
} from './format';

export interface NotationOptions {
  // Label used in the header. Pass the source filename or replay id.
  source: string;
}

/**
 * Convert a replay into a markdown game record.
 *
 * Simulates the replay through `gameReducer` (v2 replays use the recorded
 * block queue, v1 replays fall back to RNG), and emits:
 *   - one drop line + board snapshot per HARD_DROP
 *   - one sweep line per "interesting" sweep event (mark / payout)
 *   - a board snapshot + chapter header on each payout
 *
 * Each chapter is rendered as a markdown `##` heading followed by a fenced
 * code block holding that chapter's monospace move lines and board grids, so
 * the ASCII alignment survives in a markdown previewer.
 */
export function replayToNotation(
  replay: ReplayData,
  options: NotationOptions
): string {
  const expanded = expandReplayDataWithSnapshots(replay);
  const frameActions = expanded.frameActions;
  const recordedBlockQueue = getReplayBlockQueue(replay);
  const totalFrames = replayTotalFrames(
    replay.metadata?.duration,
    frameActions.length
  );

  // Markdown sections: alternating chapter headings and fenced code blocks.
  const sections: string[] = [];
  // Monospace lines accumulated for the current (open) chapter.
  let chapterLines: string[] = [];
  let dropCount = 0;
  let payoutCount = 0;
  const sweepEvents: SweepEvent[] = [];
  let dropsSinceLastPayout = 0;

  // Flush the current chapter's monospace lines as a fenced code block.
  const flushChapter = (): void => {
    if (chapterLines.length > 0) {
      sections.push('```\n' + chapterLines.join('\n') + '\n```');
      chapterLines = [];
    }
  };

  // Close the open chapter and start a new heading.
  const openChapter = (state: GameState): void => {
    flushChapter();
    sections.push(formatChapterHeader(payoutCount + 1, state));
  };

  const finalState = driveReplay(
    replay.seed,
    frameActions,
    totalFrames,
    recordedBlockQueue,
    {
      onStart: state => {
        openChapter(state);
      },
      onHardDrop: (preDrop, postState) => {
        dropCount += 1;
        dropsSinceLastPayout += 1;

        const pspBefore = preDrop.detectedPatterns.length;
        const pspDelta = postState.detectedPatterns.length - pspBefore;
        const balance = computeBoardColorBalance(postState.board).delta;
        const dead = computeDeadCells(postState.board).count;

        const tags = detectBoardTags(postState.board);
        const regret = computeDecisionRegret(
          preDrop.board,
          preDrop.fallingColumns,
          preDrop.currentBlock,
          preDrop.blockPosition.x
        ).regret;
        if (regret > 0) {
          tags.push(`MISSED-SQUARE(-${regret})`);
        }

        const dropLine = formatDropLine({
          seq: dropCount,
          frame: preDrop.frame,
          columnX: preDrop.blockPosition.x,
          sweepX: preDrop.timeline.x,
        });
        const tagSuffix = tags.length > 0 ? `  [${tags.join(' ')}]` : '';
        chapterLines.push(
          `${dropLine}  // ${formatDropAnnotation({ pspDelta, balance, dead })}${tagSuffix}`
        );
        chapterLines.push(formatBlockRow(preDrop.currentBlock, preDrop.queue));
        chapterLines.push(
          formatBoardSnapshot({
            board: postState.board,
            timelineX: postState.timeline.x,
          })
        );
      },
      onFrame: (preTick, postState) => {
        const sweep = detectSweepEvent(preTick, postState);
        if (sweep) {
          if (sweep.payout) {
            payoutCount += 1;
            const sweepLine = formatSweepLine(sweep);
            chapterLines.push(
              `${sweepLine}  // ${formatSweepAnnotation({
                clearedCells: sweep.clearedCells,
                dropsSincePrevious: dropsSinceLastPayout,
              })}`
            );
            sweepEvents.push({
              frame: postState.frame,
              clearedCells: sweep.clearedCells,
              scoreDelta: sweep.scoreDelta,
              dropsSincePrevious: dropsSinceLastPayout,
            });
            dropsSinceLastPayout = 0;
            chapterLines.push(
              formatBoardSnapshot({
                board: postState.board,
                timelineX: postState.timeline.x,
              })
            );
            // Open the next chapter unless this was the very last action.
            openChapter(postState);
          } else {
            chapterLines.push(formatSweepLine(sweep));
          }
        }
      },
    }
  );

  // Flush the final chapter (a trailing heading with no events stays bare).
  flushChapter();

  const summary: NotationSummary = {
    drops: dropCount,
    sweeps: payoutCount,
    finalScore: finalState.score,
    durationFrames: finalState.frame,
  };
  const yieldStats = computeSweepYield(sweepEvents);
  const summaryBlock = formatSummaryBlock({
    columnCounts: expanded.analytics.columnHeatmap.counts,
    balance: computeBoardColorBalance(finalState.board),
    deadCellsFinal: computeDeadCells(finalState.board).count,
    sweepYield: {
      total: yieldStats.total,
      mean: yieldStats.mean,
      payouts: sweepEvents.length,
    },
  });

  const header = formatHeader(
    replay,
    summary,
    options.source,
    expanded.analytics
  );

  return `${header}\n\n${sections.join('\n\n')}\n\n${summaryBlock}\n`;
}
