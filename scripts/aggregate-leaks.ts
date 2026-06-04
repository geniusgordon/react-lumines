import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { ReplayData } from '@/types/replay';

import { analyzePayout, type PayoutLeak } from './leaks/analyzePayout';
import { simulateReplay } from './metrics-corpus/simulateReplay';

interface GameLeaks {
  file: string;
  score: number;
  payouts: number;
  premature: number;
  bridgeable: number;
  prematureWindows: number; // total windows lost to premature payouts
}

interface CorpusLeak extends PayoutLeak {
  file: string;
  phase: 'early' | 'mid' | 'late';
}

function phaseOf(frac: number): 'early' | 'mid' | 'late' {
  if (frac < 1 / 3) {
    return 'early';
  }
  if (frac < 2 / 3) {
    return 'mid';
  }
  return 'late';
}

function pct(n: number, d: number): string {
  return d === 0 ? '  0%' : `${Math.round((100 * n) / d)
    .toString()
    .padStart(3)}%`;
}

function main(): void {
  const dir = 'replays';
  const games: GameLeaks[] = [];
  const allLeaks: CorpusLeak[] = [];
  let skipped = 0;

  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) {
      continue;
    }
    let replay: ReplayData;
    try {
      replay = JSON.parse(readFileSync(join(dir, f), 'utf8')) as ReplayData;
    } catch (err) {
      process.stderr.write(`skip ${f}: ${(err as Error).message}\n`);
      continue;
    }

    const duration = replay.metadata.duration || 1;
    const leaks: CorpusLeak[] = [];
    let payouts = 0;
    const final = simulateReplay(replay, {
      onPayout: ({ pre, post }) => {
        payouts += 1;
        const windows = post.score - pre.score;
        const gapCol = post.timeline.x;
        const leak = analyzePayout(pre.board, pre.markedCells, windows, gapCol);
        const frac = (post.frame / 60) * 1000 / duration;
        leaks.push({ ...leak, file: f, phase: phaseOf(frac) });
      },
    });

    // Trust guard: only count leaks from faithfully-reproducing replays.
    if (final.score !== replay.metadata.finalScore) {
      skipped += 1;
      continue;
    }

    const premature = leaks.filter(l => l.premature);
    const bridgeable = premature.filter(l => l.bridgeable);
    games.push({
      file: f,
      score: final.score,
      payouts,
      premature: premature.length,
      bridgeable: bridgeable.length,
      prematureWindows: premature.reduce((s, l) => s + l.windows, 0),
    });
    allLeaks.push(...leaks);
  }

  if (skipped > 0) {
    process.stderr.write(
      `WARNING: skipped ${skipped} replay(s) that did not reproduce ` +
        `(likely legacy v1) — board metrics invalid, excluded.\n`
    );
  }
  if (games.length === 0) {
    process.stderr.write('No reproducing replays found.\n');
    process.exit(1);
  }

  const totalPayouts = allLeaks.length;
  const premature = allLeaks.filter(l => l.premature);
  const bridgeable = premature.filter(l => l.bridgeable);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  // ---- Corpus summary -----------------------------------------------------
  process.stdout.write(`\n=== Leak audit — ${games.length} reproducing games ===\n\n`);
  process.stdout.write(
    `payouts: ${totalPayouts}   ` +
      `premature (<8 win): ${premature.length} (${pct(premature.length, totalPayouts)})   ` +
      `of those bridgeable: ${bridgeable.length} (${pct(bridgeable.length, premature.length)} of premature)\n`
  );
  const meanPrematureWin = premature.length
    ? sum(premature.map(l => l.windows)) / premature.length
    : 0;
  const meanPrematureSpan = premature.length
    ? sum(premature.map(l => l.span)) / premature.length
    : 0;
  process.stdout.write(
    `premature payout avg: ${meanPrematureWin.toFixed(1)} windows, ` +
      `${meanPrematureSpan.toFixed(1)} cols wide\n`
  );
  // Upside: lifting each bridgeable payout to the small threshold (8 windows).
  const upside = sum(bridgeable.map(l => Math.max(0, 8 - l.windows)));
  process.stdout.write(
    `bridgeable upside (each lifted to 8 win): +${upside} pts total, ` +
      `~+${(upside / games.length).toFixed(1)} pts/game\n`
  );

  // ---- Cluster by phase ---------------------------------------------------
  process.stdout.write(`\n--- by game phase (premature payouts) ---\n`);
  for (const phase of ['early', 'mid', 'late'] as const) {
    const inPhase = allLeaks.filter(l => l.phase === phase);
    const prem = inPhase.filter(l => l.premature);
    const brid = prem.filter(l => l.bridgeable);
    process.stdout.write(
      `  ${phase.padEnd(5)}  payouts ${inPhase.length
        .toString()
        .padStart(3)}   premature ${prem.length
        .toString()
        .padStart(3)} (${pct(prem.length, inPhase.length)})   bridgeable ${brid.length
        .toString()
        .padStart(3)}\n`
    );
  }

  // ---- Cluster by color ---------------------------------------------------
  process.stdout.write(`\n--- by dominant color (premature payouts) ---\n`);
  for (const [name, color] of [
    ['light', 1],
    ['dark', 2],
  ] as const) {
    const prem = premature.filter(l => l.dominantColor === color);
    const brid = prem.filter(l => l.bridgeable);
    process.stdout.write(
      `  ${name.padEnd(5)}  premature ${prem.length
        .toString()
        .padStart(3)} (${pct(prem.length, premature.length)} of premature)   bridgeable ${brid.length
        .toString()
        .padStart(3)}\n`
    );
  }

  // ---- Cluster by gap column ----------------------------------------------
  process.stdout.write(`\n--- where the sweep cashed early (gap column of premature payouts) ---\n`);
  const byCol = new Map<number, number>();
  for (const l of premature) {
    byCol.set(l.gapCol, (byCol.get(l.gapCol) ?? 0) + 1);
  }
  const cols = [...byCol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  for (const [col, n] of cols) {
    process.stdout.write(`  col ${col.toString().padStart(2)}  ${'█'.repeat(n)} ${n}\n`);
  }

  // ---- Worst games --------------------------------------------------------
  process.stdout.write(`\n--- worst offenders (most bridgeable fragmentation) ---\n`);
  const worst = games
    .slice()
    .sort((a, b) => b.bridgeable - a.bridgeable)
    .slice(0, 8);
  for (const g of worst) {
    process.stdout.write(
      `  ${g.file.slice(0, 8)}  score=${g.score.toString().padStart(4)}  ` +
        `payouts=${g.payouts.toString().padStart(2)}  ` +
        `premature=${g.premature.toString().padStart(2)}  ` +
        `bridgeable=${g.bridgeable.toString().padStart(2)}\n`
    );
  }
  process.stdout.write(
    `\nRun  pnpm tsx scripts/flag-leaks.ts replays/<id>.json  for a board snippet of any game.\n`
  );
}

main();
