import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { ReplayData } from '@/types/replay';
import { computeDeadCells, computeWellProfile } from '@/utils/placementMetrics';

import { simulateReplay } from './metrics-corpus/simulateReplay';

interface Game {
  file: string;
  score: number;
  meanDead: number; // buried/unfillable cells, sampled per drop
  meanBumpiness: number; // surface roughness, sampled per drop
  meanDeepWells: number; // narrow deep wells, sampled per drop
}

function main(): void {
  const dir = 'replays';
  const games: Game[] = [];
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
    const dead: number[] = [];
    const bump: number[] = [];
    const wells: number[] = [];
    const final = simulateReplay(replay, {
      onDrop: ({ pre }) => {
        dead.push(computeDeadCells(pre.board).count);
        const wp = computeWellProfile(pre.board);
        bump.push(wp.bumpiness);
        wells.push(wp.deepWellCount);
      },
    });
    if (final.score !== replay.metadata.finalScore) {
      skipped += 1;
      continue;
    }
    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    games.push({
      file: f,
      score: final.score,
      meanDead: mean(dead),
      meanBumpiness: mean(bump),
      meanDeepWells: mean(wells),
    });
  }

  if (skipped) {
    process.stderr.write(`(skipped ${skipped} non-reproducing)\n`);
  }
  games.sort((a, b) => b.score - a.score);
  const n = games.length;
  const k = Math.max(5, Math.floor(n / 5));
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const top = games.slice(0, k);
  const bottom = games.slice(n - k);

  process.stdout.write(
    `\n=== Surface / floor quality — ${n} games (sampled per drop) ===\n\n`
  );
  const row = (label: string, sel: (g: Game) => number) =>
    process.stdout.write(
      `${label.padEnd(22)} ALL ${mean(games.map(sel)).toFixed(2).padStart(6)}   ` +
        `TOP ${mean(top.map(sel)).toFixed(2).padStart(6)}   ` +
        `BOTTOM ${mean(bottom.map(sel)).toFixed(2).padStart(6)}   ` +
        `r=${pearson(
          games.map(sel),
          games.map(g => g.score)
        ).toFixed(2)}\n`
    );
  row('dead cells (buried)', g => g.meanDead);
  row('bumpiness (roughness)', g => g.meanBumpiness);
  row('deep narrow wells', g => g.meanDeepWells);
  process.stdout.write(`\n(r = Pearson vs final score)\n`);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

main();
