import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { expandReplayData, getReplayBlockQueue } from '@/utils/replayUtils';

import { detectSweepEvent } from './events';
import {
  formatBlockRow,
  formatBoardSnapshot,
  formatChapterHeader,
  formatDropLine,
  formatHeader,
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
  const frameActions = expandReplayData(replay);
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
        state = gameReducer(state, action);
        dropCount += 1;
        chapterLines.push(
          formatDropLine({
            seq: dropCount,
            frame: preDrop.frame,
            columnX: preDrop.blockPosition.x,
            sweepX: preDrop.timeline.x,
          })
        );
        chapterLines.push(
          formatBlockRow(preDrop.currentBlock, preDrop.queue)
        );
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
      chapterLines.push(formatSweepLine(sweep));
      if (sweep.payout) {
        payoutCount += 1;
        chapterLines.push(
          formatBoardSnapshot({
            board: state.board,
            timelineX: state.timeline.x,
          })
        );
        // Open the next chapter unless this was the very last action.
        openChapter();
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
  const header = formatHeader(replay, summary, options.source);

  return `${header}\n\n${sections.join('\n\n')}\n`;
}
