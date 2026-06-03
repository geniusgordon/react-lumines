import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { GameBoard, Square } from '@/types/game';

export interface PayoutLeak {
  windows: number; // 2x2 windows cashed in this payout
  dominantColor: 1 | 2;
  minCol: number; // bounding box of the cashed field (-1 if empty)
  maxCol: number;
  span: number; // columns spanned by the cashed field
  gapCol: number; // column whose missing pattern triggered the cash-out
  beyondCells: number; // same-color cells at/just past the gap, in the field's row band
  bridgeable: boolean; // beyondCells >= minBeyond — the field was fragmented
  premature: boolean; // windows < smallThreshold
}

const SMALL_THRESHOLD = 8;
const LOOKAHEAD = 3;
const MIN_BEYOND = 2;

/**
 * Classify a single payout as a "premature small payout" leak. A small payout
 * (few windows) is a fragmentation leak when same-color material sits at or just
 * past the gap column within the harvested field's row band — i.e. bridging the
 * gap would have merged two fields into one larger harvest.
 */
export function analyzePayout(
  board: GameBoard,
  markedCells: Square[],
  windows: number,
  gapCol: number,
  opts: { smallThreshold?: number; lookahead?: number; minBeyond?: number } = {}
): PayoutLeak {
  const smallThreshold = opts.smallThreshold ?? SMALL_THRESHOLD;
  const lookahead = opts.lookahead ?? LOOKAHEAD;
  const minBeyond = opts.minBeyond ?? MIN_BEYOND;

  let light = 0;
  let dark = 0;
  let minCol = BOARD_WIDTH;
  let maxCol = -1;
  let minRow = BOARD_HEIGHT;
  let maxRow = -1;
  for (const c of markedCells) {
    if (c.color === 1) {
      light += 1;
    } else if (c.color === 2) {
      dark += 1;
    }
    if (c.x < minCol) {
      minCol = c.x;
    }
    if (c.x > maxCol) {
      maxCol = c.x;
    }
    if (c.y < minRow) {
      minRow = c.y;
    }
    if (c.y > maxRow) {
      maxRow = c.y;
    }
  }
  const dominantColor: 1 | 2 = light >= dark ? 1 : 2;
  const span = maxCol >= minCol ? maxCol - minCol + 1 : 0;

  let beyondCells = 0;
  if (maxRow >= 0) {
    const from = gapCol;
    const to = Math.min(BOARD_WIDTH - 1, gapCol + lookahead);
    for (let x = from; x <= to; x++) {
      for (let y = minRow; y <= maxRow; y++) {
        if (board[y][x] === dominantColor) {
          beyondCells += 1;
        }
      }
    }
  }

  return {
    windows,
    dominantColor,
    minCol: minCol === BOARD_WIDTH ? -1 : minCol,
    maxCol,
    span,
    gapCol,
    beyondCells,
    bridgeable: beyondCells >= minBeyond,
    premature: windows < smallThreshold,
  };
}
