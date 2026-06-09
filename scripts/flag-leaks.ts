import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { BOARD_WIDTH } from '@/constants/gameConfig';
import type { GameBoard } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { validateReplayData } from '@/utils/replayUtils';

import { cellGlyph } from './glyphs';
import { analyzePayout, type PayoutLeak } from './leaks/analyzePayout';
import { simulateReplay } from './metrics-corpus/simulateReplay';

interface LeakRecord extends PayoutLeak {
  timeSec: number;
  board: GameBoard; // pre-cash board, for the snippet
}

function boardSnippet(board: GameBoard, gapCol: number): string {
  const lines: string[] = [];
  for (const row of board) {
    lines.push('  ' + row.map(v => cellGlyph(v)).join(' '));
  }
  lines.push(
    '  ' +
      Array.from({ length: BOARD_WIDTH }, (_, i) =>
        i === gapCol ? '^' : ' '
      ).join(' ') +
      '   (^ = gap column that cashed the payout)'
  );
  return lines.join('\n');
}

function main(): void {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write(
      'usage: pnpm tsx scripts/flag-leaks.ts <replay.json>\n'
    );
    process.exit(2);
  }
  let replay: ReplayData;
  try {
    replay = JSON.parse(readFileSync(path, 'utf8')) as ReplayData;
  } catch (err) {
    process.stderr.write(`failed to read ${path}: ${(err as Error).message}\n`);
    process.exit(1);
  }
  const validation = validateReplayData(replay);
  if (!validation.valid) {
    process.stderr.write(`invalid replay: ${validation.errors.join('; ')}\n`);
    process.exit(1);
  }

  const leaks: LeakRecord[] = [];
  let payouts = 0;
  const final = simulateReplay(replay, {
    onPayout: ({ pre, post }) => {
      payouts += 1;
      const windows = post.score - pre.score;
      const gapCol = post.timeline.x;
      const leak = analyzePayout(pre.board, pre.markedCells, windows, gapCol);
      leaks.push({
        ...leak,
        timeSec: post.frame / 60,
        board: pre.board.map(r => [...r]),
      });
    },
  });

  if (final.score !== replay.metadata.finalScore) {
    process.stderr.write(
      `WARNING: this replay did not reproduce (sim ${final.score} != recorded ` +
        `${replay.metadata.finalScore}) — likely legacy v1; results unreliable.\n`
    );
  }

  const premature = leaks.filter(l => l.premature);
  const bridgeable = premature.filter(l => l.bridgeable);
  const meanWindows = payouts
    ? leaks.reduce((s, l) => s + l.windows, 0) / payouts
    : 0;

  process.stdout.write(`# Leak report — ${basename(path)}\n\n`);
  process.stdout.write(
    `score=${final.score}  payouts=${payouts}  win/payout=${meanWindows.toFixed(2)}\n`
  );
  process.stdout.write(
    `premature (<8 win): ${premature.length}   of those bridgeable (fragmented): ${bridgeable.length}\n\n`
  );

  if (premature.length === 0) {
    process.stdout.write('No premature small payouts — clean harvesting.\n');
    return;
  }

  process.stdout.write('Premature small payouts:\n');
  for (const l of premature) {
    const tag = l.bridgeable
      ? `BRIDGEABLE — ${l.beyondCells} ${l.dominantColor === 1 ? 'light' : 'dark'} cells at/past gap col ${l.gapCol}; bridging would have widened the harvest`
      : 'edge/clean — little same-color material beyond the gap';
    process.stdout.write(
      `  t=${l.timeSec.toFixed(1)}s  ${l.windows} win  cols ${l.minCol}-${l.maxCol} (span ${l.span})  gap@${l.gapCol}  -> ${tag}\n`
    );
  }

  // Show the board for the worst bridgeable leak (smallest windows).
  const worst = bridgeable.slice().sort((a, b) => a.windows - b.windows)[0];
  if (worst) {
    process.stdout.write(
      `\nWorst fragmented harvest (t=${worst.timeSec.toFixed(1)}s, only ${worst.windows} windows):\n`
    );
    process.stdout.write(boardSnippet(worst.board, worst.gapCol) + '\n');
  }
}

main();
