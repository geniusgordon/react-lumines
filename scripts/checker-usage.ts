import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { BlockPattern, GameBoard, Square } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { detectPatterns } from '@/utils/gameLogic';
import { computeDecisionRegret } from '@/utils/placementMetrics';

import { cellGlyph } from './glyphs';
import { simulateReplay } from './metrics-corpus/simulateReplay';

// A checker is a 2x2 with the two diagonals each one color and the colors
// differing — true for both orientations (patterns 6 and 9) and rotation-stable.
function isChecker(p: BlockPattern): boolean {
  return (
    p.length === 2 &&
    p[0].length === 2 &&
    p[0][0] !== 0 &&
    p[0][1] !== 0 &&
    p[0][0] === p[1][1] &&
    p[0][1] === p[1][0] &&
    p[0][0] !== p[0][1]
  );
}

// Per-column gravity placement (mirrors decisionRegret.evaluate). Returns the
// resulting board plus the coordinates of the cells the block actually placed.
function place(
  board: GameBoard,
  pattern: BlockPattern,
  x: number
): { board: GameBoard; cells: Square[] } | null {
  const w = pattern[0].length;
  const h = pattern.length;
  if (x < 0 || x + w > BOARD_WIDTH) {
    return null;
  }
  const out = board.map(r => [...r]);
  const cells: Square[] = [];
  for (let px = 0; px < w; px++) {
    const col = x + px;
    let writeRow = BOARD_HEIGHT - 1;
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row][col] !== 0) {
        writeRow = row - 1;
        break;
      }
    }
    for (let py = h - 1; py >= 0; py--) {
      const c = pattern[py][px];
      if (c === 0) {
        continue;
      }
      if (writeRow < 0) {
        return null;
      }
      out[writeRow][col] = c;
      cells.push({ x: col, y: writeRow, color: c });
      writeRow -= 1;
    }
  }
  return { board: out, cells };
}

const winKey = (s: Square) => `${s.x},${s.y}`;

interface CheckerDrop {
  file: string;
  created: number; // new 2x2 windows after placing the checker
  createdTouching: number; // of those, windows that include a checker-placed cell
  regret: number;
  board: GameBoard; // pre board (for snippets)
  pattern: BlockPattern;
  x: number;
  cells: Square[];
}

interface Agg {
  drops: number;
  windowsCreated: number;
  productive: number; // created >= 1
  regretFree: number; // regret === 0
}

function main(): void {
  const dir = 'replays';
  const checker: Agg = {
    drops: 0,
    windowsCreated: 0,
    productive: 0,
    regretFree: 0,
  };
  const other: Agg = {
    drops: 0,
    windowsCreated: 0,
    productive: 0,
    regretFree: 0,
  };
  const checkerDrops: CheckerDrop[] = [];
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

    const pending: CheckerDrop[] = [];
    const localChecker: Agg = {
      drops: 0,
      windowsCreated: 0,
      productive: 0,
      regretFree: 0,
    };
    const localOther: Agg = {
      drops: 0,
      windowsCreated: 0,
      productive: 0,
      regretFree: 0,
    };

    const final = simulateReplay(replay, {
      onDrop: ({ pre }) => {
        const pat = pre.currentBlock.pattern;
        const x = pre.blockPosition.x;
        const before = new Set(detectPatterns(pre.board).map(winKey));
        const res = place(pre.board, pat, x);
        let created = 0;
        let touching = 0;
        if (res) {
          const placed = new Set(res.cells.map(winKey));
          const after = detectPatterns(res.board);
          for (const w of after) {
            if (before.has(winKey(w))) {
              continue;
            }
            created += 1;
            // does this new window's 2x2 footprint include a placed checker cell?
            const foot = [
              `${w.x},${w.y}`,
              `${w.x + 1},${w.y}`,
              `${w.x},${w.y + 1}`,
              `${w.x + 1},${w.y + 1}`,
            ];
            if (foot.some(k => placed.has(k))) {
              touching += 1;
            }
          }
        }
        const regret = computeDecisionRegret(
          pre.board,
          pre.fallingColumns,
          pre.currentBlock,
          x
        ).regret;

        const agg = isChecker(pat) ? localChecker : localOther;
        agg.drops += 1;
        agg.windowsCreated += created;
        if (created >= 1) {
          agg.productive += 1;
        }
        if (regret === 0) {
          agg.regretFree += 1;
        }

        if (isChecker(pat) && res) {
          pending.push({
            file: f,
            created,
            createdTouching: touching,
            regret,
            board: pre.board.map(r => [...r]),
            pattern: pat,
            x,
            cells: res.cells,
          });
        }
      },
    });

    if (final.score !== replay.metadata.finalScore) {
      skipped += 1;
      continue;
    }
    for (const a of [
      [checker, localChecker],
      [other, localOther],
    ] as const) {
      a[0].drops += a[1].drops;
      a[0].windowsCreated += a[1].windowsCreated;
      a[0].productive += a[1].productive;
      a[0].regretFree += a[1].regretFree;
    }
    checkerDrops.push(...pending);
  }

  if (skipped > 0) {
    process.stderr.write(`(skipped ${skipped} non-reproducing replay(s))\n`);
  }

  const pct = (n: number, d: number) =>
    d === 0 ? '0%' : `${Math.round((100 * n) / d)}%`;
  const per = (n: number, d: number) => (d === 0 ? '0' : (n / d).toFixed(2));

  process.stdout.write(
    `\n=== Checker usage — ${checker.drops} checker drops in corpus ` +
      `(${checkerDrops.length} with a legal footprint) ===\n`
  );
  process.stdout.write(
    `\n${'block type'.padEnd(12)} ${'drops'.padStart(6)} ${'productive'.padStart(11)} ${'win/drop'.padStart(9)} ${'regret-free'.padStart(12)}\n`
  );
  for (const [name, a] of [
    ['checker', checker],
    ['non-checker', other],
  ] as const) {
    process.stdout.write(
      `${name.padEnd(12)} ${a.drops.toString().padStart(6)} ` +
        `${(pct(a.productive, a.drops) + ` (${a.productive})`).padStart(11)} ` +
        `${per(a.windowsCreated, a.drops).padStart(9)} ` +
        `${pct(a.regretFree, a.drops).padStart(12)}\n`
    );
  }

  const productive = checkerDrops.filter(d => d.created >= 1);
  const touching = checkerDrops.filter(d => d.createdTouching >= 1);
  process.stdout.write(
    `\nOf checker drops: ${productive.length} created >=1 window (${pct(
      productive.length,
      checkerDrops.length
    )}); ` +
      `${touching.length} created a window that USES a checker cell (${pct(
        touching.length,
        checkerDrops.length
      )}).\n`
  );
  process.stdout.write(
    `=> "always contaminates" is ${touching.length > 0 ? 'FALSE' : 'true'}: ` +
      `a checker cell directly completed a 2x2 in ${touching.length} real drops.\n`
  );

  // Top examples where a checker cell completed windows — read off the pattern.
  process.stdout.write(
    `\n--- top checker placements that completed windows (local snippet) ---\n`
  );
  const top = touching
    .slice()
    .sort(
      (a, b) => b.createdTouching - a.createdTouching || b.created - a.created
    )
    .slice(0, 6);
  for (const d of top) {
    printExample(d);
  }
  process.stdout.write(
    `\nLegend: · empty  ○ light  ● dark   * = cell placed by this checker drop\n`
  );
}

function printExample(d: CheckerDrop): void {
  const placed = new Set(d.cells.map(winKey));
  const after = place(d.board, d.pattern, d.x);
  const lo = Math.max(0, d.x - 2);
  const hi = Math.min(BOARD_WIDTH - 1, d.x + 3);
  // crop rows to the interesting band: a few rows around where cells landed
  const ys = d.cells.map(c => c.y);
  const top = Math.max(0, Math.min(...ys) - 2);
  const bot = Math.min(BOARD_HEIGHT - 1, Math.max(...ys) + 1);
  process.stdout.write(
    `\n${d.file.slice(0, 8)}  checker @col ${d.x}  created ${d.created} win (${d.createdTouching} using a checker cell), regret ${d.regret}\n`
  );
  process.stdout.write(`  cols ${lo}..${hi}   (after drop; * = placed)\n`);
  for (let y = top; y <= bot && after; y++) {
    let line = '  ';
    for (let x = lo; x <= hi; x++) {
      const here = `${x},${y}`;
      const ch = cellGlyph(after.board[y][x]);
      line += (placed.has(here) ? `${ch}*` : `${ch} `) + ' ';
    }
    process.stdout.write(line + '\n');
  }
}

main();
