import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { ReplayData } from '@/types/replay';
import { computeDecisionRegret } from '@/utils/placementMetrics';

import { simulateReplay } from './metrics-corpus/simulateReplay';

interface Row {
  file: string;
  score: number;
  payouts: number;
  drops: number;
  winPerPayout: number; // score / payouts  (mean 2x2-windows cashed per payout)
  biggestPayout: number; // largest single payout (windows)
  totalRegret: number; // sum over drops of (best-achievable windows - chosen)
  meanRegret: number;
}

function analyze(replay: ReplayData, file: string): Row {
  let payouts = 0;
  let drops = 0;
  let totalRegret = 0;
  let biggest = 0;
  const final = simulateReplay(replay, {
    onDrop: ({ pre }) => {
      drops += 1;
      totalRegret += computeDecisionRegret(
        pre.board,
        pre.fallingColumns,
        pre.currentBlock,
        pre.blockPosition.x
      ).regret;
    },
    onPayout: ({ pre, post }) => {
      payouts += 1;
      const d = post.score - pre.score;
      if (d > biggest) {
        biggest = d;
      }
    },
  });
  const score = final.score;
  return {
    file,
    score,
    payouts,
    drops,
    winPerPayout: payouts === 0 ? 0 : score / payouts,
    biggestPayout: biggest,
    totalRegret,
    meanRegret: drops === 0 ? 0 : totalRegret / drops,
  };
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function summarize(label: string, rows: Row[]): void {
  process.stdout.write(
    `${label.padEnd(14)} score=${mean(rows.map(r => r.score)).toFixed(1)}  ` +
      `payouts=${mean(rows.map(r => r.payouts)).toFixed(1)}  ` +
      `win/payout=${mean(rows.map(r => r.winPerPayout)).toFixed(2)}  ` +
      `biggest=${mean(rows.map(r => r.biggestPayout)).toFixed(1)}  ` +
      `drops=${mean(rows.map(r => r.drops)).toFixed(1)}  ` +
      `totRegret=${mean(rows.map(r => r.totalRegret)).toFixed(1)}\n`
  );
}

function main(): void {
  const dir = 'replays';
  const rows: Row[] = [];
  let skipped = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) {
      continue;
    }
    try {
      const replay = JSON.parse(
        readFileSync(join(dir, f), 'utf8')
      ) as ReplayData;
      const row = analyze(replay, f);
      // Trust guard: only analyze replays that reproduce faithfully. A v1
      // (RNG-only) replay whose simulated score != recorded finalScore did NOT
      // replay the game you actually played, so its board metrics are fiction.
      if (row.score !== replay.metadata.finalScore) {
        skipped += 1;
        continue;
      }
      rows.push(row);
    } catch (err) {
      process.stderr.write(`skip ${f}: ${(err as Error).message}\n`);
    }
  }
  if (skipped > 0) {
    process.stderr.write(
      `WARNING: skipped ${skipped} replay(s) that did not reproduce ` +
        `(simulated score != recorded finalScore — likely legacy v1). ` +
        `Board-level metrics are only valid for faithfully-reproducing v2 replays.\n`
    );
  }
  if (rows.length < 2) {
    process.stderr.write(
      `Only ${rows.length} reproducing replay(s) — need >= 2 for a meaningful breakdown.\n`
    );
    process.exit(1);
  }
  rows.sort((a, b) => b.score - a.score);

  const n = rows.length;
  const k = Math.max(5, Math.floor(n / 5)); // top/bottom quintile (>=5)
  const top = rows.slice(0, k);
  const bottom = rows.slice(n - k);

  process.stdout.write(`\n=== Your ${n} games — score decomposition ===\n`);
  process.stdout.write(
    `score = payouts x win/payout (win/payout = mean 2x2 windows cashed per sweep)\n\n`
  );
  summarize('ALL', rows);
  summarize(`TOP ${k}`, top);
  summarize(`BOTTOM ${k}`, bottom);

  // Which lever moves with score: payout COUNT or payout SIZE?
  const dPayouts =
    mean(top.map(r => r.payouts)) - mean(bottom.map(r => r.payouts));
  const dSize =
    mean(top.map(r => r.winPerPayout)) - mean(bottom.map(r => r.winPerPayout));
  process.stdout.write(
    `\nTop-vs-bottom gap:  +${dPayouts.toFixed(2)} payouts,  +${dSize.toFixed(2)} win/payout\n`
  );
  process.stdout.write(
    `Decomposed: more payouts contributes ~${(dPayouts * mean(rows.map(r => r.winPerPayout))).toFixed(1)} pts, ` +
      `bigger payouts ~${(dSize * mean(rows.map(r => r.payouts))).toFixed(1)} pts.\n`
  );

  process.stdout.write(`\nYour best game:  `);
  const b = rows[0];
  process.stdout.write(
    `score=${b.score} payouts=${b.payouts} win/payout=${b.winPerPayout.toFixed(2)} biggest=${b.biggestPayout} (${b.file})\n`
  );
  const w = rows[n - 1];
  process.stdout.write(
    `Your worst game: score=${w.score} payouts=${w.payouts} win/payout=${w.winPerPayout.toFixed(2)} biggest=${w.biggestPayout} (${w.file})\n`
  );
}

main();
