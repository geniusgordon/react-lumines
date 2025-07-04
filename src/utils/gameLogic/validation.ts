import { BOARD_HEIGHT } from '@/constants/gameConfig';
import type { GameBoard, Block, Position, FallingColumn } from '@/types/game';

import { isValidPosition } from './collision';

/**
 * Find lowest valid position for hard drop
 */
export function findDropPosition(
  board: GameBoard,
  block: Block,
  position: Position,
  fallingColumns: FallingColumn[]
): Position {
  let dropY = position.y;

  while (dropY < BOARD_HEIGHT) {
    const testPos = { x: position.x, y: dropY + 1 };
    if (isValidPosition(board, block, testPos, fallingColumns) === 'valid') {
      dropY++;
    } else {
      break;
    }
  }

  return { x: position.x, y: dropY };
}
