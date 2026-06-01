import { BOARD_HEIGHT, BOARD_WIDTH } from '@/constants/gameConfig';
import type {
  Block,
  BlockPattern,
  FallingColumn,
  GameBoard,
} from '@/types/game';
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
        best = {
          windows: candidate.windows,
          dead: candidate.dead,
          x,
          rotation,
        };
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
 * For evaluation purposes we use per-column gravity (matching
 * createFallingColumns/applyGravity): each column the block covers settles
 * independently to its own floor, so a 2-wide block over uneven columns does
 * NOT stay rigid — its halves land separately.
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

  const newBoard: GameBoard = board.map(row => [...row]);

  // Per-column gravity: each covered column's cells fall to that column's own
  // floor, independently (matching createFallingColumns/applyGravity). A 2-wide
  // block over uneven columns does NOT stay rigid — its halves land separately.
  for (let px = 0; px < patternW; px++) {
    const col = x + px;

    // First empty row above this column's stack (BOARD_HEIGHT-1 if column empty).
    let writeRow = BOARD_HEIGHT - 1;
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row][col] !== 0) {
        writeRow = row - 1;
        break;
      }
    }

    // Place this column's pattern cells from the bottom pattern row upward.
    for (let py = patternH - 1; py >= 0; py--) {
      const cell = pattern[py][px];
      if (cell === 0) {
        continue;
      }
      if (writeRow < 0) {
        return null; // column overflow -> illegal placement
      }
      newBoard[writeRow][col] = cell;
      writeRow -= 1;
    }
  }

  return {
    windows: detectPatterns(newBoard).length,
    dead: computeDeadCells(newBoard).count,
  };
}
