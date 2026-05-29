import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import {
  computeColorBalance,
  computeDeadCells,
  computeSweepYield,
  type SweepEvent,
} from '@/utils/placementMetrics';
import {
  expandReplayDataWithSnapshots,
  getReplayBlockQueue,
} from '@/utils/replayUtils';

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

  let state: GameState = createInitialGameState(
    replay.seed,
    false,
    'normal',
    recordedBlockQueue
  );
  state = gameReducer(state, { type: 'START_GAME' });
  state = gameReducer(state, { type: 'SKIP_COUNTDOWN' });

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
  const openChapter = (): void => {
    flushChapter();
    sections.push(formatChapterHeader(payoutCount + 1, state));
  };

  // Emit a leading chapter header so the first events have a parent.
  openChapter();

  for (const frameData of frameActions) {
    for (const action of frameData.userActions as GameAction[]) {
      if (action.type === 'HARD_DROP') {
        const preDrop = state;
        const pspBefore = preDrop.detectedPatterns.length;
        state = gameReducer(state, action);
        dropCount += 1;
        dropsSinceLastPayout += 1;

        const pspDelta = state.detectedPatterns.length - pspBefore;
        const balance = computeColorBalance(state.spawnedBlocks).delta;
        const dead = computeDeadCells(state.board).count;

        const dropLine = formatDropLine({
          seq: dropCount,
          frame: preDrop.frame,
          columnX: preDrop.blockPosition.x,
          sweepX: preDrop.timeline.x,
        });
        chapterLines.push(
          `${dropLine}  // ${formatDropAnnotation({ pspDelta, balance, dead })}`
        );
        chapterLines.push(formatBlockRow(preDrop.currentBlock, preDrop.queue));
        chapterLines.push(
          formatBoardSnapshot({
            board: state.board,
            timelineX: state.timeline.x,
          })
        );
      } else {
        state = gameReducer(state, action);
      }
    }

    const preTick = state;
    state = gameReducer(state, { type: 'TICK' });

    const sweep = detectSweepEvent(preTick, state);
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
          frame: state.frame,
          clearedCells: sweep.clearedCells,
          scoreDelta: sweep.scoreDelta,
          dropsSincePrevious: dropsSinceLastPayout,
        });
        dropsSinceLastPayout = 0;
        chapterLines.push(
          formatBoardSnapshot({
            board: state.board,
            timelineX: state.timeline.x,
          })
        );
        // Open the next chapter unless this was the very last action.
        openChapter();
      } else {
        chapterLines.push(formatSweepLine(sweep));
      }
    }
  }

  // Flush the final chapter (a trailing heading with no events stays bare).
  flushChapter();

  const summary: NotationSummary = {
    drops: dropCount,
    sweeps: payoutCount,
    finalScore: state.score,
    durationFrames: state.frame,
  };
  const yieldStats = computeSweepYield(sweepEvents);
  const summaryBlock = formatSummaryBlock({
    columnCounts: expanded.analytics.columnHeatmap.counts,
    balance: computeColorBalance(state.spawnedBlocks),
    deadCellsFinal: computeDeadCells(state.board).count,
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
