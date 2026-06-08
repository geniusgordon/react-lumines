// Generates faithful, real-replay board diagrams for the strategy docs in the
// circle notation: · empty · ○ light · ● dark · ◌/◍ cleared this sweep · * placed.
// Run: pnpm tsx scripts/doc-examples.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { BlockPattern, GameBoard, Square } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { detectPatterns } from '@/utils/gameLogic';

import { analyzePayout } from './leaks/analyzePayout';
import { simulateReplay } from './metrics-corpus/simulateReplay';

function place(board: GameBoard, pattern: BlockPattern, x: number): { board: GameBoard; cells: Square[] } | null {
  const w = pattern[0].length;
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
    for (let py = pattern.length - 1; py >= 0; py--) {
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

const key = (x: number, y: number) => `${x},${y}`;

function render(
  board: GameBoard,
  lo: number,
  hi: number,
  opts: { cleared?: Set<string>; placed?: Set<string> } = {}
): string {
  const lines: string[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    let any = false;
    let line = '  ';
    for (let x = lo; x <= hi; x++) {
      const v = board[y][x];
      const k = key(x, y);
      if (v !== 0) {
        any = true;
      }
      if (opts.cleared?.has(k)) {
        line += v === 1 ? '◌ ' : '◍ ';
      } else if (opts.placed?.has(k)) {
        line += (v === 1 ? '○' : '●') + '*';
      } else {
        line += (v === 0 ? '·' : v === 1 ? '○' : '●') + ' ';
      }
    }
    if (any) {
      lines.push(line);
    }
  }
  return lines.join('\n');
}

function loadAll(): { file: string; replay: ReplayData }[] {
  const dir = 'replays';
  const out: { file: string; replay: ReplayData }[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) {
      continue;
    }
    try {
      out.push({ file: f, replay: JSON.parse(readFileSync(join(dir, f), 'utf8')) as ReplayData });
    } catch {
      /* skip */
    }
  }
  return out;
}

interface Side { file: string; board: GameBoard; marked: Square[]; delta: number; minor: number }
interface Leak { file: string; board: GameBoard; marked: Square[]; gapCol: number; beyond: number; windows: number }
interface Pure { file: string; before: GameBoard; after: GameBoard; placed: Set<string>; x: number; created: number }
interface Cash { board: GameBoard; marked: Square[]; cols: Set<number>; delta: number }

// Find the longest run of consecutive same-region cashes (>50% column overlap).
function longestChain(cashes: Cash[]): Cash[] {
  let best: Cash[] = [];
  let start = 0;
  for (let i = 1; i <= cashes.length; i++) {
    const broke =
      i === cashes.length ||
      (() => {
        const a = cashes[i - 1].cols;
        const b = cashes[i].cols;
        const inter = [...b].filter(c => a.has(c)).length;
        const uni = new Set([...a, ...b]).size;
        return (uni ? inter / uni : 0) <= 0.5;
      })();
    if (broke) {
      if (i - start > best.length) {
        best = cashes.slice(start, i);
      }
      start = i;
    }
  }
  return best;
}

function bounds(cells: { x: number }[]): [number, number] {
  const xs = cells.map(c => c.x);
  return [Math.max(0, Math.min(...xs) - 1), Math.min(BOARD_WIDTH - 1, Math.max(...xs) + 1)];
}

function main(): void {
  const corpus = loadAll();

  // --- Example 1: two-color side-by-side harvest (both colors cashed in one run)
  let bestSide: Side | null = null;
  // --- Example 2: a premature bridgeable leak (the bad case)
  let leak: Leak | null = null;
  // --- Example 3: a clean pure extend (before/after)
  let pureEx: Pure | null = null;
  // --- Example 4: the all-light target harvest (off-color on top scores nothing)
  let target: { file: string; board: GameBoard; marked: Square[]; delta: number } | null = null;
  // --- Example 5: a combo chain (consecutive cashes of one region)
  const CHAIN_FILE = '01982c72';

  for (const { file, replay } of corpus) {
    const final = simulateReplay(replay, {
      onDrop: ({ pre, post }) => {
        void post;
        const p = pre.currentBlock.pattern;
        const isPure = p[0][0] === p[0][1] && p[0][0] === p[1][0] && p[0][0] === p[1][1];
        if (!isPure) {
          return;
        }
        const before = detectPatterns(pre.board).length;
        const res = place(pre.board, p, pre.blockPosition.x);
        if (!res) {
          return;
        }
        const created = detectPatterns(res.board).length - before;
        if (created >= 4 && (!pureEx || created > pureEx.created)) {
          pureEx = {
            file,
            before: pre.board.map(r => [...r]),
            after: res.board,
            placed: new Set(res.cells.map(c => key(c.x, c.y))),
            x: pre.blockPosition.x,
            created,
          };
        }
      },
      onPayout: ({ pre, post }) => {
        const marked = pre.markedCells;
        const light = marked.filter(c => c.color === 1).length;
        const dark = marked.filter(c => c.color === 2).length;
        const minor = Math.min(light, dark);
        const delta = post.score - pre.score;
        if (minor >= 6 && delta >= 16 && (!bestSide || minor > bestSide.minor)) {
          bestSide = { file, board: pre.board.map(r => [...r]), marked: marked.map(c => ({ ...c })), delta, minor };
        }
        const gapCol = post.timeline.x;
        const a = analyzePayout(pre.board, marked, delta, gapCol);
        if (a.premature && a.bridgeable && a.beyondCells >= 3 && (!leak || a.beyondCells > leak.beyond)) {
          leak = { file, board: pre.board.map(r => [...r]), marked: marked.map(c => ({ ...c })), gapCol, beyond: a.beyondCells, windows: delta };
        }
        // all-light target harvest with surviving dark on top
        if (dark === 0 && delta >= 20 && (!target || delta > target.delta)) {
          target = { file, board: pre.board.map(r => [...r]), marked: marked.map(c => ({ ...c })), delta };
        }
      },
    });
    void final;
  }

  // collect the chain example separately so its cashes stay in order
  const chainCashes: Cash[] = [];
  const chainReplay = corpus.find(c => c.file.startsWith(CHAIN_FILE));
  if (chainReplay) {
    simulateReplay(chainReplay.replay, {
      onPayout: ({ pre, post }) => {
        chainCashes.push({
          board: pre.board.map(r => [...r]),
          marked: pre.markedCells.map(c => ({ ...c })),
          cols: new Set(pre.markedCells.map(c => c.x)),
          delta: post.score - pre.score,
        });
      },
    });
  }

  process.stdout.write('Legend: · empty  ○ light  ● dark  ◌/◍ cleared this sweep  * placed by drop\n');

  if (bestSide) {
    const s: Side = bestSide;
    const [lo, hi] = bounds(s.marked);
    process.stdout.write(`\n### Two-color side-by-side harvest (${s.file.slice(0, 8)}, ${s.delta} windows)\n\n`);
    process.stdout.write(render(s.board, lo, hi, { cleared: new Set(s.marked.map(c => key(c.x, c.y))) }) + '\n');
  }

  if (leak) {
    const s: Leak = leak;
    const [lo, hi] = bounds([...s.marked, { x: Math.min(BOARD_WIDTH - 1, s.gapCol + 2) }]);
    process.stdout.write(`\n### Premature leak — cashed at gap col ${s.gapCol}, only ${s.windows} windows (${s.file.slice(0, 8)})\n\n`);
    process.stdout.write(render(s.board, lo, hi, { cleared: new Set(s.marked.map(c => key(c.x, c.y))) }) + '\n');
    process.stdout.write(`  (gap column = ${s.gapCol}; ${s.beyond} same-color cells sat just past it — bridge it and this is one big harvest)\n`);
  }

  if (pureEx) {
    const s: Pure = pureEx;
    const cells = [...s.placed].map(k => ({ x: Number(k.split(',')[0]) }));
    const [lo, hi] = bounds(cells);
    process.stdout.write(`\n### Pure extend (+${s.created} windows in one drop, ${s.file.slice(0, 8)} @col ${s.x})\n\n`);
    process.stdout.write('before:\n' + render(s.before, lo, hi) + '\n\nafter:\n' + render(s.after, lo, hi, { placed: s.placed }) + '\n');
  }

  if (target) {
    const s: { file: string; board: GameBoard; marked: Square[]; delta: number } = target;
    const [lo, hi] = bounds(s.marked);
    process.stdout.write(`\n### Target harvest — all-light, ${s.delta} windows (${s.file.slice(0, 8)})\n\n`);
    process.stdout.write(render(s.board, lo, hi, { cleared: new Set(s.marked.map(c => key(c.x, c.y))) }) + '\n');
    process.stdout.write('  (every cleared cell is light; the ● on top is dead weight that scored nothing)\n');
  }

  const chain = longestChain(chainCashes);
  if (chain.length >= 3) {
    const mid = Math.max(0, Math.floor(chain.length / 2) - 1);
    const three = chain.slice(mid, mid + 3);
    const allCols = three.flatMap(c => [...c.cols]);
    const lo = Math.max(0, Math.min(...allCols) - 1);
    const hi = Math.min(BOARD_WIDTH - 1, Math.max(...allCols) + 1);
    process.stdout.write(`\n### Combo chain — 3 consecutive cashes of one region (${CHAIN_FILE}, chain length ${chain.length})\n`);
    for (let i = 0; i < three.length; i++) {
      process.stdout.write(`\ncash ${mid + i + 1}: ${three[i].delta} windows\n`);
      process.stdout.write(render(three[i].board, lo, hi, { cleared: new Set(three[i].marked.map(c => key(c.x, c.y))) }) + '\n');
    }
  }
}

main();
