import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type { Block, BlockPattern, FallingColumn, GameBoard } from '@/types/game';
import { detectPatterns, rotateBlockPattern } from '@/utils/gameLogic';

// FallingColumn is part of the public API signature so callers can pass game
// state directly; it is intentionally unused in the evaluation logic because
// hypothetical drops are evaluated on the settled board only.

import { computeDeadCells } from './deadCells';
import type { DecisionRegretResult } from './types';

/**
 * For a single drop, compare the placement the player chose against the best
 * legal alternative (every column x every rotation), scoring each by the number
 * of internal 2x2 windows it creates — the exact points the resulting board can
 * yield. Regret = bestWindows - chosenWindows. Ties broken toward fewer dead
 * cells. This converts intuition into "you left N points on the table on this
 * move".
 */
export function computeDecisionRegret(
  board: GameBoard,
  _fallingColumns: FallingColumn[],
  block: Block,
  chosenX: number
): DecisionRegretResult {
  const chosen = evaluate(board, block.pattern, chosenX);
  const chosenWindows = chosen?.windows ?? 0;
  const chosenDead = chosen?.dead ?? 0;

  let best = {
    windows: chosenWindows,
    dead: chosenDead,
    x: chosenX,
    rotation: 0,
  };

  let pattern: BlockPattern = block.pattern;
  for (let rotation = 0; rotation < 4; rotation++) {
    if (rotation > 0) {
      pattern = rotateBlockPattern(pattern, true);
    }
    for (let x = 0; x <= BOARD_WIDTH - pattern[0].length; x++) {
      const candidate = evaluate(board, pattern, x);
      if (!candidate) {
        continue;
      }
      const better =
        candidate.windows > best.windows ||
        (candidate.windows === best.windows && candidate.dead < best.dead);
      if (better) {
        best = { windows: candidate.windows, dead: candidate.dead, x, rotation };
      }
    }
  }

  return {
    regret: best.windows - chosenWindows,
    chosenWindows,
    bestWindows: best.windows,
    bestX: best.x,
    bestRotation: best.rotation,
    chosenDead,
    bestDead: best.dead,
  };
}

/**
 * Simulate a hard drop of `pattern` at column `x` onto `board`, then score
 * the resulting board by window count and dead-cell count.
 *
 * NOTE: We do NOT use placeBlockOnBoard/findDropPosition here because those
 * functions operate in the game's "top-entry" coordinate system (blocks enter
 * from y=-2 and placeBlockOnBoard only works correctly when position.y < 0).
 * For evaluation purposes we compute column heights directly and write the
 * placed cells by hand.
 */
function evaluate(
  board: GameBoard,
  pattern: BlockPattern,
  x: number
): { windows: number; dead: number } | null {
  const patternW = pattern[0].length;
  const patternH = pattern.length;

  if (x < 0 || x + patternW > BOARD_WIDTH) {
    return null;
  }

  // Compute the topmost row (0-based from top) that is occupied per column.
  // "top of stack" = first non-zero row from the top in that column,
  // or BOARD_HEIGHT if the column is empty.
  function stackTop(col: number): number {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row][col] !== 0) {
        return row;
      }
    }
    return BOARD_HEIGHT;
  }

  // For each column the block covers, find the landing row for that column
  // of the pattern. The block lands so its bottom row sits just above the
  // existing stack. "landingRow" = the board row occupied by the BOTTOM row
  // of the pattern in column x+px.
  //
  // landingRow = stackTop(x + px) - 1  (one row above the existing stack top)
  // The block's bottom pattern row (patternH-1) sits at landingRow,
  // so the block's top pattern row (0) sits at landingRow - (patternH-1).
  //
  // We need the same vertical offset for all columns (gravity is uniform).
  // The limiting column is whichever has the highest stack.
  let landingRow = BOARD_HEIGHT - 1; // row where the bottom of pattern lands
  for (let px = 0; px < patternW; px++) {
    const col = x + px;
    const top = stackTop(col);
    // block bottom must be at top-1 at most
    landingRow = Math.min(landingRow, top - 1);
  }

  // Top row where pattern[0] is placed
  const topRow = landingRow - (patternH - 1);

  // Reject if pattern would go above the board
  if (topRow < 0) {
    return null;
  }

  // Build a copy of the board with the block placed
  const newBoard: GameBoard = board.map(row => [...row]);
  for (let py = 0; py < patternH; py++) {
    for (let px = 0; px < patternW; px++) {
      const cell = pattern[py][px];
      if (cell !== 0) {
        newBoard[topRow + py][x + px] = cell;
      }
    }
  }

  return {
    windows: detectPatterns(newBoard).length,
    dead: computeDeadCells(newBoard).count,
  };
}

