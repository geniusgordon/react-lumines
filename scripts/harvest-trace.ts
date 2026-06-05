import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { BlockPattern, GameBoard, Square } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import { simulateReplay } from './metrics-corpus/simulateReplay';

// ---- per-column gravity placement (to annotate which cells a drop added) -----
function place(board: GameBoard, pattern: BlockPattern, x: number): Square[] {
  const w = pattern[0].length;
  const h = pattern.length;
  if (x < 0 || x + w > BOARD_WIDTH) {
    return [];
  }
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
        break;
      }
      cells.push({ x: col, y: writeRow, color: pattern[py][px] });
      writeRow -= 1;
    }
  }
  return cells;
}

interface DropSnap {
  board: GameBoard;
  x: number;
  placed: Square[];
}
interface Payout {
  file: string;
  delta: number;
  board: GameBoard; // pre-cash board (marked cells still present)
  marked: Square[];
  gapCol: number;
  history: DropSnap[]; // recent drops leading up to the cash
  // cap analysis
  cols: number[];
  blockingCaps: number; // off-color cells surviving on top of the field
  openTops: number; // field columns that could still have grown up
  harvestedCaps: number; // off-color on top that was ALSO cleared this run
  openHeights: number[]; // harvested cells in each open-top column
  blockHeights: number[]; // harvested cells in each blocking-cap column
}

function analyzeCaps(board: GameBoard, marked: Square[]) {
  const markSet = new Set(marked.map(c => `${c.x},${c.y}`));
  const topByCol = new Map<number, { row: number; color: number }>();
  for (const c of marked) {
    const cur = topByCol.get(c.x);
    if (!cur || c.y < cur.row) {
      topByCol.set(c.x, { row: c.y, color: c.color });
    }
  }
  // harvested cells per column (the column's contribution height to this payout)
  const heightByCol = new Map<number, number>();
  for (const c of marked) {
    heightByCol.set(c.x, (heightByCol.get(c.x) ?? 0) + 1);
  }
  let blockingCaps = 0;
  let openTops = 0;
  let harvestedCaps = 0;
  const openHeights: number[] = [];
  const blockHeights: number[] = [];
  for (const [col, top] of topByCol) {
    const h = heightByCol.get(col) ?? 0;
    const above = top.row - 1;
    if (above < 0) {
      continue; // hit the ceiling — couldn't grow regardless
    }
    const cell = board[above][col];
    if (cell === 0) {
      openTops += 1;
      openHeights.push(h);
    } else if (cell !== top.color) {
      if (markSet.has(`${above},${col}`)) {
        harvestedCaps += 1; // the other color's window was harvested too
      } else {
        blockingCaps += 1; // off-color survives on top — blocks upward growth
        blockHeights.push(h);
      }
    }
  }
  return {
    cols: [...topByCol.keys()].sort((a, b) => a - b),
    blockingCaps,
    openTops,
    harvestedCaps,
    openHeights,
    blockHeights,
  };
}

const HIST = 5;

function collect(): Payout[] {
  const dir = 'replays';
  const out: Payout[] = [];
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
    const buffer: DropSnap[] = [];
    const local: Payout[] = [];
    const final = simulateReplay(replay, {
      onDrop: ({ pre }) => {
        const snap: DropSnap = {
          board: pre.board.map(r => [...r]),
          x: pre.blockPosition.x,
          placed: place(pre.board, pre.currentBlock.pattern, pre.blockPosition.x),
        };
        buffer.push(snap);
        if (buffer.length > HIST) {
          buffer.shift();
        }
      },
      onPayout: ({ pre, post }) => {
        const marked = pre.markedCells.map(c => ({ ...c }));
        const caps = analyzeCaps(pre.board, marked);
        local.push({
          file: f,
          delta: post.score - pre.score,
          board: pre.board.map(r => [...r]),
          marked,
          gapCol: post.timeline.x,
          history: buffer.map(s => ({ ...s, board: s.board.map(r => [...r]) })),
          ...caps,
        });
      },
    });
    if (final.score === replay.metadata.finalScore) {
      out.push(...local);
    }
  }
  return out;
}

function sym(v: number): string {
  return v === 1 ? 'L' : v === 2 ? 'D' : '·';
}

function printBoard(
  board: GameBoard,
  lo: number,
  hi: number,
  marked?: Set<string>,
  placed?: Set<string>,
  rowLo = 0,
  rowHi = BOARD_HEIGHT - 1
): void {
  for (let y = rowLo; y <= rowHi; y++) {
    let line = '   ';
    for (let x = lo; x <= hi; x++) {
      const k = `${x},${y}`;
      let ch = sym(board[y][x]);
      if (marked?.has(k)) {
        ch = ch.toLowerCase() === ch ? ch : ch; // keep letter; mark with *
        line += `${ch}*`;
      } else if (placed?.has(k)) {
        line += `${ch}+`;
      } else {
        line += `${ch} `;
      }
      line += ' ';
    }
    process.stdout.write(line + '\n');
  }
}

function main(): void {
  const mode = process.argv[2] ?? 'caps';
  const payouts = collect();

  if (mode === 'caps' || mode === 'all') {
    process.stdout.write(`\n=== Off-color-on-top test — ${payouts.length} payouts ===\n`);
    // Bucket payouts by whether the field top survived as off-color (blocking).
    const withBlock = payouts.filter(p => p.blockingCaps > 0);
    const noBlock = payouts.filter(p => p.blockingCaps === 0);
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    process.stdout.write(
      `\nfields with a SURVIVING off-color cap on top: ${withBlock.length} ` +
        `(${Math.round((100 * withBlock.length) / payouts.length)}%)\n`
    );
    process.stdout.write(
      `  mean payout WITH blocking cap : ${mean(withBlock.map(p => p.delta)).toFixed(2)} windows ` +
        `(span ${mean(withBlock.map(p => p.cols.length)).toFixed(1)} cols)\n`
    );
    process.stdout.write(
      `  mean payout WITHOUT blocking cap: ${mean(noBlock.map(p => p.delta)).toFixed(2)} windows ` +
        `(span ${mean(noBlock.map(p => p.cols.length)).toFixed(1)} cols)\n`
    );
    // Per-column view: of all field columns at cash time, how many tops were
    // open / harvested-cap / blocked?
    const open = payouts.reduce((s, p) => s + p.openTops, 0);
    const harv = payouts.reduce((s, p) => s + p.harvestedCaps, 0);
    const block = payouts.reduce((s, p) => s + p.blockingCaps, 0);
    const tot = open + harv + block || 1;
    process.stdout.write(
      `\nfield-column tops at cash time (${tot} cols):  ` +
        `open ${open} (${Math.round((100 * open) / tot)}%)   ` +
        `harvested-cap ${harv} (${Math.round((100 * harv) / tot)}%)   ` +
        `blocking-cap ${block} (${Math.round((100 * block) / tot)}%)\n`
    );
    // Among the biggest harvests, what do their tops look like?
    const big = payouts.slice().sort((a, b) => b.delta - a.delta).slice(0, 20);
    const bigOpen = big.reduce((s, p) => s + p.openTops, 0);
    const bigBlock = big.reduce((s, p) => s + p.blockingCaps, 0);
    const bigHarv = big.reduce((s, p) => s + p.harvestedCaps, 0);
    process.stdout.write(
      `\nTOP 20 harvests (mean ${mean(big.map(p => p.delta)).toFixed(1)} win): ` +
        `tops open ${bigOpen}, harvested-cap ${bigHarv}, blocking-cap ${bigBlock}\n`
    );
    // Decisive: do OPEN-top columns harvest taller than BLOCKING-capped ones?
    const allOpen = payouts.flatMap(p => p.openHeights);
    const allBlock = payouts.flatMap(p => p.blockHeights);
    process.stdout.write(
      `\nharvested cells per column:  open-top ${mean(allOpen).toFixed(2)} ` +
        `(n=${allOpen.length})   vs   blocking-capped ${mean(allBlock).toFixed(2)} (n=${allBlock.length})\n`
    );
    process.stdout.write(
      `(if open-top columns harvest taller, capping the field with off-color cost height/windows)\n`
    );
  }

  if (mode === 'trace' || mode === 'all') {
    const big = payouts.slice().sort((a, b) => b.delta - a.delta).slice(0, 3);
    process.stdout.write(`\n=== Construction of the ${big.length} biggest harvests ===\n`);
    process.stdout.write(`(+ = cell this drop placed; * = cell cleared in the harvest)\n`);
    for (const p of big) {
      const lo = Math.max(0, Math.min(...p.cols) - 1);
      const hi = Math.min(BOARD_WIDTH - 1, Math.max(...p.cols) + 1);
      const markSet = new Set(p.marked.map(c => `${c.x},${c.y}`));
      process.stdout.write(
        `\n----- ${p.file.slice(0, 8)}  ${p.delta} windows  cols ${Math.min(
          ...p.cols
        )}-${Math.max(...p.cols)}  (open ${p.openTops}, blocking-cap ${p.blockingCaps}) -----\n`
      );
      let i = 0;
      for (const s of p.history) {
        i += 1;
        process.stdout.write(`\n  drop -${p.history.length - i} (@col ${s.x}):\n`);
        printBoard(s.board, lo, hi, undefined, new Set(s.placed.map(c => `${c.x},${c.y}`)));
      }
      process.stdout.write(`\n  >>> at cash (marked = *):\n`);
      printBoard(p.board, lo, hi, markSet);
    }
  }
}

main();
