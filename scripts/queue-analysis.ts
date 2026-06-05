import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { BlockPattern, GameBoard } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { detectPatterns, rotateBlockPattern } from '@/utils/gameLogic';

import { simulateReplay } from './metrics-corpus/simulateReplay';

// Settle a block (per-column gravity) and return resulting board, or null if illegal.
function place(board: GameBoard, pattern: BlockPattern, x: number): GameBoard | null {
  const w = pattern[0].length;
  if (x < 0 || x + w > BOARD_WIDTH) {
    return null;
  }
  const out = board.map(r => [...r]);
  for (let px = 0; px < w; px++) {
    const col = x + px;
    let writeRow = BOARD_HEIGHT - 1;
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row][col] !== 0) {
        writeRow = row - 1;
        break;
      }
    }
    for (let py = pattern.length - 1; py >= 0; py--) {
      if (writeRow < 0) {
        return null;
      }
      out[writeRow][col] = pattern[py][px];
      writeRow -= 1;
    }
  }
  return out;
}

// Best window delta achievable for one block over all rotations x columns.
function bestWindows(board: GameBoard, pat: BlockPattern): { windows: number; board: GameBoard } {
  const base = detectPatterns(board).length;
  let best = { windows: 0, board };
  let p = pat;
  for (let r = 0; r < 4; r++) {
    if (r > 0) {
      p = rotateBlockPattern(p, true);
    }
    for (let x = 0; x <= BOARD_WIDTH - p[0].length; x++) {
      const nb = place(board, p, x);
      if (!nb) {
        continue;
      }
      const w = detectPatterns(nb).length - base;
      if (w > best.windows) {
        best = { windows: w, board: nb };
      }
    }
  }
  return best;
}

interface Game {
  file: string;
  score: number;
  // 2-ply: did the chosen current move set up the NEXT block better than the
  // 1-ply-greedy current move would have?
  setupGain: number; // mean (nextBest | chosen) - (nextBest | greedy)
  forecastRate: number; // share of drops where chosen beats greedy on 2-ply total
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
    const setupGains: number[] = [];
    let forecast = 0;
    let drops = 0;
    const final = simulateReplay(replay, {
      onDrop: ({ pre }) => {
        const next = pre.queue[0];
        if (!next) {
          return;
        }
        drops += 1;
        const base = detectPatterns(pre.board).length;

        // chosen current placement
        const chosenBoard = place(pre.board, pre.currentBlock.pattern, pre.blockPosition.x);
        if (!chosenBoard) {
          return;
        }
        const chosenNow = detectPatterns(chosenBoard).length - base;
        const chosenNext = bestWindows(chosenBoard, next.pattern).windows;

        // 1-ply greedy current placement (max windows now), then its next-best
        const greedy = bestWindows(pre.board, pre.currentBlock.pattern);
        const greedyNext = bestWindows(greedy.board, next.pattern).windows;

        // how much more the NEXT block can do because of the chosen (vs greedy) move
        setupGains.push(chosenNext - greedyNext);
        // 2-ply total: chosen-now+chosen-next vs greedy-now+greedy-next
        if (chosenNow + chosenNext > greedy.windows + greedyNext) {
          forecast += 1;
        }
      },
    });
    if (final.score !== replay.metadata.finalScore) {
      skipped += 1;
      continue;
    }
    games.push({
      file: f,
      score: final.score,
      setupGain: setupGains.length ? setupGains.reduce((a, b) => a + b, 0) / setupGains.length : 0,
      forecastRate: drops ? forecast / drops : 0,
    });
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

  process.stdout.write(`\n=== Queue / forecast play — ${n} games (2-ply vs greedy) ===\n\n`);
  process.stdout.write(
    `setup-gain (extra windows the NEXT block gains from the chosen vs greedy move):\n` +
      `  ALL ${mean(games.map(g => g.setupGain)).toFixed(3)}   ` +
      `TOP ${mean(top.map(g => g.setupGain)).toFixed(3)}   ` +
      `BOTTOM ${mean(bottom.map(g => g.setupGain)).toFixed(3)}\n`
  );
  process.stdout.write(
    `forecast-rate (chosen beats greedy on 2-ply total):\n` +
      `  ALL ${(100 * mean(games.map(g => g.forecastRate))).toFixed(1)}%   ` +
      `TOP ${(100 * mean(top.map(g => g.forecastRate))).toFixed(1)}%   ` +
      `BOTTOM ${(100 * mean(bottom.map(g => g.forecastRate))).toFixed(1)}%\n`
  );
  process.stdout.write(
    `\nPearson(setup-gain, score)   = ${pearson(games.map(g => g.setupGain), games.map(g => g.score)).toFixed(3)}\n` +
      `Pearson(forecast-rate, score) = ${pearson(games.map(g => g.forecastRate), games.map(g => g.score)).toFixed(3)}\n`
  );
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
