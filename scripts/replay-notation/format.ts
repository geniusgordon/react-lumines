import { BOARD_HEIGHT, BOARD_WIDTH, TARGET_FPS } from '@/constants/gameConfig';
import type { Block, CellValue, GameBoard, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';

const HEX = '0123456789ABCDEF';
const CELL_GLYPH: Record<CellValue, string> = {
  0: '.',
  1: '□', // □ light
  2: '■', // ■ dark
};

function cell(v: CellValue): string {
  return CELL_GLYPH[v];
}

function hexCol(x: number): string {
  return HEX[x] ?? '?';
}

// Labels for the current block followed by the upcoming queue.
const BLOCK_LABELS = ['cur', 'nxt', '+2', '+3', '+4', '+5'];

// Render a single block's two rows, e.g. ['■ ■', '□ □'] (board cell spacing).
function blockGridRows(block: Block): [string, string] {
  const [[tl, tr], [bl, br]] = block.pattern as CellValue[][];
  return [`${cell(tl)} ${cell(tr)}`, `${cell(bl)} ${cell(br)}`];
}

/**
 * Render the current block and the upcoming queue as side-by-side 2x2 grids
 * with a label row, e.g.:
 *   cur  nxt  +2   +3
 *   ■ ■  ■ ■  □ ■  ■ □
 *   □ □  □ □  □ ■  ■ □
 */
export function formatBlockRow(current: Block, queue: Block[]): string {
  const cols = [current, ...queue].map((block, i) => {
    const [top, bot] = blockGridRows(block);
    const label = BLOCK_LABELS[i] ?? `+${i}`;
    const width = Math.max(label.length, top.length);
    return {
      label: label.padEnd(width),
      top: top.padEnd(width),
      bot: bot.padEnd(width),
    };
  });
  const sep = '  ';
  return [
    cols.map(c => c.label).join(sep),
    cols.map(c => c.top).join(sep),
    cols.map(c => c.bot).join(sep),
  ]
    .map(line => line.trimEnd())
    .join('\n');
}

function formatTimeFromFrame(frame: number): string {
  return `${(frame / TARGET_FPS).toFixed(1)}s`;
}

export interface DropLineFields {
  seq: number;
  frame: number;
  columnX: number; // left column (0..BOARD_WIDTH-1); block occupies columnX..columnX+1
  sweepX: number;
}

export function formatDropLine(d: DropLineFields): string {
  const colRight = d.columnX + 1;
  return (
    `#${String(d.seq).padStart(2, '0')}  ` +
    `f=${d.frame} (${formatTimeFromFrame(d.frame)})  ` +
    `col=${hexCol(d.columnX)}-${hexCol(colRight)}  ` +
    `sweep@col=${hexCol(d.sweepX)}`
  );
}

export interface SweepLineFields {
  fromX: number;
  toX: number;
  clearedCells: number;
  scoreDelta: number;
  payout: boolean; // true when holding score was paid out this event
}

export function formatSweepLine(s: SweepLineFields): string {
  const tag = s.payout ? '>>> SWEEP' : '... mark';
  const tail = s.payout ? '  holding→paid' : '';
  return (
    `${tag} col=${hexCol(s.fromX)}→${hexCol(s.toX)}  ` +
    `cleared=${s.clearedCells} cells  +${s.scoreDelta}${tail}`
  );
}

/**
 * Render the board as multi-line ASCII.
 * Includes a column header row (hex 0..F) and 10 data rows.
 * The current falling block is NOT rendered — this is used for
 * post-event snapshots after the block has settled or cleared.
 */
export function renderBoard(board: GameBoard): string {
  const headerCols = Array.from({ length: BOARD_WIDTH }, (_, x) => hexCol(x));
  const header = `   ${headerCols.join(' ')}`;

  const rows: string[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    const cells = board[y].map(v => cell(v as CellValue)).join(' ');
    rows.push(`${y.toString().padStart(2, ' ')} ${cells}`);
  }

  return [header, ...rows].join('\n');
}

export interface BoardSnapshotFields {
  board: GameBoard;
  timelineX: number;
}

export function formatBoardSnapshot(b: BoardSnapshotFields): string {
  return `${renderBoard(b.board)}\ntimeline@col=${hexCol(b.timelineX)}`;
}

export interface NotationSummary {
  drops: number;
  sweeps: number;
  finalScore: number;
  durationFrames: number;
}

export interface AnalyticsSummary {
  peakChainLength: number;
  peakChainFrame: number;
  boardEfficiency: number;
  keyMoments: unknown[];
  scoreDistribution: { small: number; medium: number; large: number };
}

export function formatHeader(
  replay: ReplayData,
  summary: NotationSummary,
  filenameOrId: string,
  analytics?: AnalyticsSummary
): string {
  const lines: string[] = [];
  lines.push(`# Replay ${filenameOrId}`);
  lines.push('');
  lines.push(`- schema version: ${replay.version ?? 1}`);
  lines.push(`- seed: ${replay.seed}`);
  if (replay.metadata.playerName) {
    lines.push(`- player: ${replay.metadata.playerName}`);
  }
  lines.push(`- final score: ${summary.finalScore}`);
  lines.push(
    `- duration: ${summary.durationFrames} frames (${formatTimeFromFrame(summary.durationFrames)})`
  );
  lines.push(`- drops: ${summary.drops}, sweep payouts: ${summary.sweeps}`);
  if (analytics) {
    const eff = Math.round(analytics.boardEfficiency * 100);
    const sd = analytics.scoreDistribution;
    lines.push(
      `- analytics: peakChain=${analytics.peakChainLength} (f=${analytics.peakChainFrame}), efficiency=${eff}%, keyMoments=${analytics.keyMoments.length}, scoreDistribution=${sd.small}/${sd.medium}/${sd.large}`
    );
  }
  return lines.join('\n');
}

export function formatChapterHeader(
  index: number,
  state: Pick<GameState, 'frame'>
): string {
  return `## Sweep #${index}  (f=${state.frame}, t=${formatTimeFromFrame(state.frame)})`;
}

export interface DropAnnotationFields {
  pspDelta: number;
  balance: number; // light - dark; positive means more light spawned
  dead: number;
}

function pspArrow(delta: number): string {
  if (delta > 0) {
    return `▲+${delta}`;
  }
  if (delta < 0) {
    return `▼${delta}`;
  }
  return `=0`;
}

function balanceLabel(balance: number): string {
  if (balance > 0) {
    return `bal=L${balance}`;
  }
  if (balance < 0) {
    return `bal=D${Math.abs(balance)}`;
  }
  return `bal=0`;
}

export function formatDropAnnotation(f: DropAnnotationFields): string {
  const parts = [`PSP ${pspArrow(f.pspDelta)}`, balanceLabel(f.balance)];
  if (f.dead > 0) {
    parts.push(`dead=${f.dead}`);
  }
  return parts.join('  ');
}

export interface SweepAnnotationFields {
  clearedCells: number;
  dropsSincePrevious: number;
}

export function formatSweepAnnotation(f: SweepAnnotationFields): string {
  const ratio =
    f.dropsSincePrevious === 0
      ? '∞'
      : (f.clearedCells / f.dropsSincePrevious).toFixed(2);
  return `yield=${f.clearedCells}  drops=${f.dropsSincePrevious}  ratio=${ratio}`;
}

const HEATMAP_GLYPHS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function formatColumnHeatmapAscii(counts: number[]): string {
  const max = Math.max(0, ...counts);
  const glyphs = counts.map(c => {
    if (max === 0) {
      return HEATMAP_GLYPHS[0];
    }
    const idx = Math.min(
      HEATMAP_GLYPHS.length - 1,
      Math.floor((c / max) * (HEATMAP_GLYPHS.length - 1))
    );
    return HEATMAP_GLYPHS[idx];
  });
  const header = '  0 1 2 3 4 5 6 7 8 9 A B C D E F';
  return `${header}\n  ${glyphs.join(' ')}`;
}

export interface SummaryFields {
  columnCounts: number[];
  balance: {
    light: number;
    dark: number;
    delta: number;
    magnitudeRatio: number;
  };
  deadCellsFinal: number;
  sweepYield: { total: number; mean: number; payouts: number };
}

export function formatSummaryBlock(f: SummaryFields): string {
  const lines: string[] = [];
  lines.push('## Summary');
  lines.push('');
  lines.push('```');
  lines.push('column placement heatmap:');
  lines.push(formatColumnHeatmapAscii(f.columnCounts));
  lines.push('');
  const pct = Math.round(f.balance.magnitudeRatio * 100);
  lines.push(
    `color balance: light=${f.balance.light} dark=${f.balance.dark} (Δ=${f.balance.delta}, imbalance=${pct}%)`
  );
  lines.push(`dead cells (final): ${f.deadCellsFinal}`);
  lines.push(
    `sweep payouts: ${f.sweepYield.payouts}  total yield: ${f.sweepYield.total} cells  mean yield/payout: ${f.sweepYield.mean.toFixed(2)}`
  );
  lines.push('```');
  return lines.join('\n');
}
