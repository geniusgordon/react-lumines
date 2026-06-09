import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { BlockPattern, GameBoard, Square } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { detectPatterns } from '@/utils/gameLogic';
import { computeDecisionRegret } from '@/utils/placementMetrics';

import { cellGlyph } from './glyphs';
import { simulateReplay } from './metrics-corpus/simulateReplay';

type Kind = 'pure' | 'single-off' | 'domino-H' | 'domino-V' | 'checker';

// Classify a 2x2 block (all BLOCK_PATTERNS cells are 1 or 2, never empty).
function kindOf(p: BlockPattern): Kind {
  const cells = [p[0][0], p[0][1], p[1][0], p[1][1]];
  const ones = cells.filter(c => c === 1).length;
  if (ones === 0 || ones === 4) {
    return 'pure';
  }
  if (ones === 1 || ones === 3) {
    return 'single-off';
  }
  // 2-2 split: checker (diagonals match) / horizontal (rows uniform) / vertical.
  if (p[0][0] === p[1][1] && p[0][1] === p[1][0]) {
    return 'checker';
  }
  if (p[0][0] === p[0][1]) {
    return 'domino-H';
  }
  return 'domino-V';
}

// Per-column gravity placement; returns resulting board + placed cell coords.
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
      if (writeRow < 0) {
        return null;
      }
      out[writeRow][col] = pattern[py][px];
      cells.push({ x: col, y: writeRow, color: pattern[py][px] });
      writeRow -= 1;
    }
  }
  return { board: out, cells };
}

// Color-agnostic landing class for one column: does the block's BOTTOM cell in
// that column land on the same color (extend), opposite color (cap), or floor?
type Landing = 'same' | 'opp' | 'floor';
function landingOf(
  board: GameBoard,
  pattern: BlockPattern,
  x: number,
  px: number
): Landing {
  const col = x + px;
  let surfaceRow = -1;
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (board[row][col] !== 0) {
      surfaceRow = row;
      break;
    }
  }
  if (surfaceRow < 0) {
    return 'floor';
  }
  const bottomCell = pattern[pattern.length - 1][px];
  return board[surfaceRow][col] === bottomCell ? 'same' : 'opp';
}

const winKey = (s: { x: number; y: number }) => `${s.x},${s.y}`;

interface PatternStat {
  count: number;
  windows: number; // total windows created across drops with this signature
  productive: number;
  regretFree: number;
  example?: {
    file: string;
    board: GameBoard;
    pattern: BlockPattern;
    x: number;
    cells: Square[];
    created: number;
  };
}

interface KindStat {
  drops: number;
  windows: number;
  productive: number;
  regretFree: number;
}

function main(): void {
  const dir = 'replays';
  const sigs = new Map<string, PatternStat>();
  const kinds = new Map<Kind, KindStat>();
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

    const localSigs = new Map<string, PatternStat>();
    const localKinds = new Map<Kind, KindStat>();

    const final = simulateReplay(replay, {
      onDrop: ({ pre }) => {
        const pat = pre.currentBlock.pattern;
        const x = pre.blockPosition.x;
        const kind = kindOf(pat);
        const before = new Set(detectPatterns(pre.board).map(winKey));
        const res = place(pre.board, pat, x);
        let created = 0;
        if (res) {
          const after = detectPatterns(res.board);
          for (const w of after) {
            if (!before.has(winKey(w))) {
              created += 1;
            }
          }
        }
        const regret = computeDecisionRegret(
          pre.board,
          pre.fallingColumns,
          pre.currentBlock,
          x
        ).regret;

        const k = localKinds.get(kind) ?? {
          drops: 0,
          windows: 0,
          productive: 0,
          regretFree: 0,
        };
        k.drops += 1;
        k.windows += created;
        if (created >= 1) {
          k.productive += 1;
        }
        if (regret === 0) {
          k.regretFree += 1;
        }
        localKinds.set(kind, k);

        if (!res) {
          return;
        }
        const l0 = landingOf(pre.board, pat, x, 0);
        const l1 = landingOf(pre.board, pat, x, 1);
        // order-independent landing pair so L/R mirror images merge
        const pair = [l0, l1].sort().join('+');
        const sig = `${kind} :: ${pair}`;
        const s = localSigs.get(sig) ?? {
          count: 0,
          windows: 0,
          productive: 0,
          regretFree: 0,
        };
        s.count += 1;
        s.windows += created;
        if (created >= 1) {
          s.productive += 1;
        }
        if (regret === 0) {
          s.regretFree += 1;
        }
        // keep the highest-window example for this signature
        if (created >= 1 && (!s.example || created > s.example.created)) {
          s.example = {
            file: f,
            board: pre.board.map(r => [...r]),
            pattern: pat,
            x,
            cells: res.cells,
            created,
          };
        }
        localSigs.set(sig, s);
      },
    });

    if (final.score !== replay.metadata.finalScore) {
      skipped += 1;
      continue;
    }
    for (const [k, v] of localKinds) {
      const g = kinds.get(k) ?? {
        drops: 0,
        windows: 0,
        productive: 0,
        regretFree: 0,
      };
      g.drops += v.drops;
      g.windows += v.windows;
      g.productive += v.productive;
      g.regretFree += v.regretFree;
      kinds.set(k, g);
    }
    for (const [sig, v] of localSigs) {
      const g = sigs.get(sig) ?? {
        count: 0,
        windows: 0,
        productive: 0,
        regretFree: 0,
      };
      g.count += v.count;
      g.windows += v.windows;
      g.productive += v.productive;
      g.regretFree += v.regretFree;
      if (v.example && (!g.example || v.example.created > g.example.created)) {
        g.example = v.example;
      }
      sigs.set(sig, g);
    }
  }

  if (skipped > 0) {
    process.stderr.write(`(skipped ${skipped} non-reproducing replay(s))\n`);
  }
  const pct = (n: number, d: number) =>
    d === 0 ? '0%' : `${Math.round((100 * n) / d)}%`;
  const per = (n: number, d: number) => (d === 0 ? '0.00' : (n / d).toFixed(2));

  // ---- per-kind summary ---------------------------------------------------
  process.stdout.write(`\n=== Block kinds — yield per drop ===\n`);
  process.stdout.write(
    `${'kind'.padEnd(12)} ${'drops'.padStart(6)} ${'win/drop'.padStart(9)} ${'productive'.padStart(11)} ${'regret-free'.padStart(12)}\n`
  );
  const kindOrder: Kind[] = [
    'pure',
    'single-off',
    'domino-H',
    'domino-V',
    'checker',
  ];
  for (const k of kindOrder) {
    const v = kinds.get(k);
    if (!v) {
      continue;
    }
    process.stdout.write(
      `${k.padEnd(12)} ${v.drops.toString().padStart(6)} ${per(v.windows, v.drops).padStart(9)} ` +
        `${pct(v.productive, v.drops).padStart(11)} ${pct(v.regretFree, v.drops).padStart(12)}\n`
    );
  }

  // ---- ranked patterns ----------------------------------------------------
  process.stdout.write(
    `\n=== Building patterns, ranked by total windows produced ===\n`
  );
  process.stdout.write(
    `(landing = where each half's bottom cell sat: same color / opp color / floor)\n`
  );
  const ranked = [...sigs.entries()].sort(
    (a, b) => b[1].windows - a[1].windows
  );
  for (const [sig, s] of ranked) {
    process.stdout.write(
      `\n${sig}\n  used ${s.count}x  |  ${s.windows} win total (${per(s.windows, s.count)}/drop)  |  ` +
        `productive ${pct(s.productive, s.count)}  |  regret-free ${pct(s.regretFree, s.count)}\n`
    );
    if (s.example) {
      printExample(s.example);
    }
  }
  process.stdout.write(
    `\nLegend: · empty  ○ light  ● dark   * = cell placed by this drop\n`
  );
}

function printExample(ex: {
  file: string;
  board: GameBoard;
  pattern: BlockPattern;
  x: number;
  cells: Square[];
  created: number;
}): void {
  const placed = new Set(ex.cells.map(winKey));
  const after = place(ex.board, ex.pattern, ex.x);
  if (!after) {
    return;
  }
  const lo = Math.max(0, ex.x - 2);
  const hi = Math.min(BOARD_WIDTH - 1, ex.x + 3);
  const ys = ex.cells.map(c => c.y);
  const top = Math.max(0, Math.min(...ys) - 1);
  const bot = Math.min(BOARD_HEIGHT - 1, Math.max(...ys) + 2);
  process.stdout.write(
    `  e.g. ${ex.file.slice(0, 8)} @col ${ex.x}, +${ex.created} win  (cols ${lo}..${hi}; * = placed)\n`
  );
  for (let y = top; y <= bot; y++) {
    let line = '   ';
    for (let x = lo; x <= hi; x++) {
      const ch = cellGlyph(after.board[y][x]);
      line += (placed.has(`${x},${y}`) ? `${ch}*` : `${ch} `) + ' ';
    }
    process.stdout.write(line + '\n');
  }
}

main();
