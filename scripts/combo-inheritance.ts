import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOARD_HEIGHT } from '@/constants/gameConfig';
import type { GameBoard } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import { simulateReplay } from './metrics-corpus/simulateReplay';

interface PayoutRec {
  frame: number;
  delta: number;
  cols: Set<number>;
  residue: number; // occupied cells left on the board right after the cash
  colHeights: Map<number, number>; // post-cash stack height per column
  preBoard: GameBoard; // board at cash (marked cells present)
  marked: Set<string>;
}

interface Game {
  file: string;
  score: number;
  payouts: number;
  chained: number; // payouts that re-harvest the previous region (Jaccard>0.5)
  meanGapChained: number; // frames between chained payouts
  meanResidue: number;
  scaffoldReuse: number; // mean fraction of a harvest built ON inherited stack
}

function colHeights(board: GameBoard): Map<number, number> {
  const h = new Map<number, number>();
  for (let x = 0; x < board[0].length; x++) {
    let top = BOARD_HEIGHT;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y][x] !== 0) {
        top = y;
        break;
      }
    }
    h.set(x, BOARD_HEIGHT - top); // 0 if empty column
  }
  return h;
}

function occupied(board: GameBoard): number {
  let n = 0;
  for (const row of board) {
    for (const c of row) {
      if (c !== 0) {
        n += 1;
      }
    }
  }
  return n;
}

function main(): void {
  const mode = process.argv[2] ?? 'stats';
  const dir = 'replays';
  const games: Game[] = [];
  const corpus: { file: string; recs: PayoutRec[] }[] = [];
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
    const recs: PayoutRec[] = [];
    const final = simulateReplay(replay, {
      onPayout: ({ pre, post }) => {
        const cols = new Set(pre.markedCells.map(c => c.x));
        recs.push({
          frame: post.frame,
          delta: post.score - pre.score,
          cols,
          residue: occupied(post.board),
          colHeights: colHeights(post.board),
          preBoard: pre.board.map(r => [...r]),
          marked: new Set(pre.markedCells.map(c => `${c.x},${c.y}`)),
        });
      },
    });
    if (final.score !== replay.metadata.finalScore) {
      skipped += 1;
      continue;
    }

    let chained = 0;
    const gaps: number[] = [];
    const reuse: number[] = [];
    for (let i = 1; i < recs.length; i++) {
      const a = recs[i - 1];
      const b = recs[i];
      const inter = [...b.cols].filter(c => a.cols.has(c)).length;
      const uni = new Set([...a.cols, ...b.cols]).size;
      const jac = uni ? inter / uni : 0;
      if (jac > 0.5) {
        chained += 1;
        gaps.push(b.frame - a.frame);
      }
      // scaffold reuse: of b's harvested columns, how tall was the stack it
      // inherited from a's post-cash board? More inherited height = building on
      // scaffolding rather than from the floor.
      let inheritedH = 0;
      let totalH = 0;
      for (const c of b.cols) {
        inheritedH += a.colHeights.get(c) ?? 0;
        totalH += b.colHeights.get(c) ?? 0;
      }
      // ratio of (height present before this build) to (height when it cashed)
      if (totalH > 0) {
        reuse.push(Math.min(1, inheritedH / (inheritedH + b.delta / Math.max(1, b.cols.size))));
      }
    }
    games.push({
      file: f,
      score: final.score,
      payouts: recs.length,
      chained,
      meanGapChained: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
      meanResidue: recs.length ? recs.reduce((s, r) => s + r.residue, 0) / recs.length : 0,
      scaffoldReuse: reuse.length ? reuse.reduce((a, b) => a + b, 0) / reuse.length : 0,
    });
    corpus.push({ file: f, recs });
  }

  if (mode === 'trace') {
    traceLongestChain(corpus);
    return;
  }

  if (skipped) {
    process.stderr.write(`(skipped ${skipped} non-reproducing)\n`);
  }
  games.sort((a, b) => b.score - a.score);
  const n = games.length;
  const k = Math.max(5, Math.floor(n / 5));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const top = games.slice(0, k);
  const bottom = games.slice(n - k);

  process.stdout.write(`\n=== Combo chaining & inheritance — ${n} games ===\n\n`);
  const allChainRate = mean(games.map(g => g.chained / Math.max(1, g.payouts)));
  process.stdout.write(
    `chained payouts (re-harvest same region, col-overlap>50%): ` +
      `${(100 * allChainRate).toFixed(1)}% of payouts\n`
  );
  process.stdout.write(
    `  TOP ${k}: ${(100 * mean(top.map(g => g.chained / Math.max(1, g.payouts)))).toFixed(1)}%   ` +
      `BOTTOM ${k}: ${(100 * mean(bottom.map(g => g.chained / Math.max(1, g.payouts)))).toFixed(1)}%\n`
  );
  process.stdout.write(
    `mean frames between chained payouts: ${mean(games.map(g => g.meanGapChained).filter(Boolean)).toFixed(0)} ` +
      `(sweep cycle ~ board-width × sweep-interval)\n`
  );
  process.stdout.write(
    `\nmean residue (cells left after a cash):  ALL ${mean(games.map(g => g.meanResidue)).toFixed(1)}   ` +
      `TOP ${mean(top.map(g => g.meanResidue)).toFixed(1)}   BOTTOM ${mean(bottom.map(g => g.meanResidue)).toFixed(1)}\n`
  );
  process.stdout.write(
    `scaffold-reuse index (0=from floor, 1=on inherited stack): ` +
      `TOP ${mean(top.map(g => g.scaffoldReuse)).toFixed(2)}   BOTTOM ${mean(bottom.map(g => g.scaffoldReuse)).toFixed(2)}\n`
  );

  process.stdout.write(`\nPearson(chain-rate, score)   = ${pearson(games.map(g => g.chained / Math.max(1, g.payouts)), games.map(g => g.score)).toFixed(3)}\n`);
  process.stdout.write(`Pearson(mean-residue, score) = ${pearson(games.map(g => g.meanResidue), games.map(g => g.score)).toFixed(3)}\n`);
}

// Find the longest run of consecutive payouts whose regions overlap (>50%
// columns), then print each cash in that run cropped to the region so the
// refill-and-re-harvest cycle is visible.
function traceLongestChain(corpus: { file: string; recs: PayoutRec[] }[]): void {
  let best: { file: string; recs: PayoutRec[] } | null = null;
  for (const g of corpus) {
    let runStart = 0;
    for (let i = 1; i <= g.recs.length; i++) {
      const broke =
        i === g.recs.length ||
        (() => {
          const a = g.recs[i - 1];
          const b = g.recs[i];
          const inter = [...b.cols].filter(c => a.cols.has(c)).length;
          const uni = new Set([...a.cols, ...b.cols]).size;
          return (uni ? inter / uni : 0) <= 0.5;
        })();
      if (broke) {
        const run = g.recs.slice(runStart, i);
        if (!best || run.length > best.recs.length) {
          best = { file: g.file, recs: run };
        }
        runStart = i;
      }
    }
  }
  if (!best) {
    process.stdout.write('no chain found\n');
    return;
  }
  const allCols = best.recs.flatMap(r => [...r.cols]);
  const lo = Math.max(0, Math.min(...allCols) - 1);
  const hi = Math.min(15, Math.max(...allCols) + 1);
  process.stdout.write(
    `\n=== Longest combo chain: ${best.file.slice(0, 8)} — ` +
      `${best.recs.length} consecutive cashes of the same region (cols ${lo}-${hi}) ===\n`
  );
  process.stdout.write(`(* = cleared this cash; the region refills and pays again each sweep cycle)\n`);
  let prev = 0;
  for (let i = 0; i < best.recs.length; i++) {
    const r = best.recs[i];
    const gap = i === 0 ? 0 : r.frame - prev;
    prev = r.frame;
    process.stdout.write(
      `\n  cash ${i + 1}: ${r.delta} windows` + (i > 0 ? `  (+${gap} frames ≈ ${(gap / 240).toFixed(1)} sweep cycles)` : '') + `\n`
    );
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      let line = '   ';
      let any = false;
      for (let x = lo; x <= hi; x++) {
        const v = r.preBoard[y][x];
        if (v !== 0) {
          any = true;
        }
        const ch = v === 1 ? 'L' : v === 2 ? 'D' : '·';
        line += r.marked.has(`${x},${y}`) ? `${ch}*` : `${ch} `;
      }
      if (any) {
        process.stdout.write(line + '\n');
      }
    }
  }
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
