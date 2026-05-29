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

export function formatHeader(
  replay: ReplayData,
  summary: NotationSummary,
  filenameOrId: string
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
  return lines.join('\n');
}

export function formatChapterHeader(
  index: number,
  state: Pick<GameState, 'frame'>
): string {
  return `## Sweep #${index}  (f=${state.frame}, t=${formatTimeFromFrame(state.frame)})`;
}
