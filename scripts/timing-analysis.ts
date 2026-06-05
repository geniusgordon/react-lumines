import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOARD_WIDTH } from '@/constants/gameConfig';
import type { ReplayData } from '@/types/replay';

import { simulateReplay } from './metrics-corpus/simulateReplay';

// "lead" = how far ahead of the sweep (in its left->right direction) a drop lands.
// 0 = same column as the sweep; 1 = the very next column it will reach (least time
// to finish the field); BOARD_WIDTH-1 = the column it just passed (most time).
function lead(dropCol: number, timelineX: number): number {
  return ((dropCol - timelineX) % BOARD_WIDTH + BOARD_WIDTH) % BOARD_WIDTH;
}

interface Game {
  file: string;
  score: number;
  meanLead: number;
  // drops landing in the danger zone (1..3 cols ahead of the sweep)
  dangerRate: number;
}

function main(): void {
  const dir = 'replays';
  const games: Game[] = [];
  // global lead histogram, and lead at drops that precede a premature cash
  const leadHist = new Array(BOARD_WIDTH).fill(0);
  let skipped = 0;

  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) {
      continue;
    }
    let replay: ReplayData;
    try {
      replay = JSON.parse(readFileSync(join(dir, f), 'utf8')) as ReplayData;
    } catch {
      continue;
    }
    const leads: number[] = [];
    const localHist = new Array(BOARD_WIDTH).fill(0);
    const final = simulateReplay(replay, {
      onDrop: ({ pre }) => {
        // a 2-wide block — use its left column + 0.5, rounded via both cols
        const x = pre.blockPosition.x;
        const l = lead(x, pre.timeline.x);
        leads.push(l);
        localHist[l] += 1;
      },
    });
    if (final.score !== replay.metadata.finalScore) {
      skipped += 1;
      continue;
    }
    for (let i = 0; i < BOARD_WIDTH; i++) {
      leadHist[i] += localHist[i];
    }
    const danger = leads.filter(l => l >= 1 && l <= 3).length;
    games.push({
      file: f,
      score: final.score,
      meanLead: leads.reduce((a, b) => a + b, 0) / leads.length,
      dangerRate: danger / leads.length,
    });
  }

  if (skipped) {
    process.stderr.write(`(skipped ${skipped} non-reproducing)\n`);
  }
  games.sort((a, b) => b.score - a.score);
  const n = games.length;
  const k = Math.max(5, Math.floor(n / 5));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  process.stdout.write(`\n=== Timeline timing — where drops land relative to the sweep ===\n`);
  process.stdout.write(`(lead = columns ahead of the sweep in its travel direction;\n`);
  process.stdout.write(` 1 = swept next/least build time, ${BOARD_WIDTH - 1} = just swept/most build time)\n\n`);

  const total = leadHist.reduce((a, b) => a + b, 0);
  for (let l = 0; l < BOARD_WIDTH; l++) {
    const pct = (100 * leadHist[l]) / total;
    process.stdout.write(
      `  lead ${l.toString().padStart(2)}  ${'█'.repeat(Math.round(pct))} ${pct.toFixed(1)}%\n`
    );
  }

  const top = games.slice(0, k);
  const bottom = games.slice(n - k);
  process.stdout.write(
    `\nmean lead:      TOP ${k} = ${mean(top.map(g => g.meanLead)).toFixed(2)}   ` +
      `BOTTOM ${k} = ${mean(bottom.map(g => g.meanLead)).toFixed(2)}\n`
  );
  process.stdout.write(
    `danger-zone rate (lead 1-3): TOP ${k} = ${(100 * mean(top.map(g => g.dangerRate))).toFixed(1)}%   ` +
      `BOTTOM ${k} = ${(100 * mean(bottom.map(g => g.dangerRate))).toFixed(1)}%\n`
  );

  // crude correlation of meanLead with score (Spearman-ish via Pearson on ranks)
  const xs = games.map(g => g.meanLead);
  const ys = games.map(g => g.score);
  process.stdout.write(`\nPearson(meanLead, score) = ${pearson(xs, ys).toFixed(3)}\n`);
  process.stdout.write(`Pearson(dangerRate, score) = ${pearson(games.map(g => g.dangerRate), ys).toFixed(3)}\n`);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

main();
