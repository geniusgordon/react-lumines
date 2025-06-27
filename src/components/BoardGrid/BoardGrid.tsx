import React from 'react';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import { GAME_FIELD_Z_INDEX, getZIndexClass } from '@/constants/zIndex';
import type { GameBoard as GameBoardType } from '@/types/game';

import { GridCell } from '../GridCell';

export interface BoardGridProps {
  board: GameBoardType;
}

/**
 * BoardGrid renders the static 16x10 grid of cells
 * Pure rendering component for the game board state
 */
export const BoardGrid: React.FC<BoardGridProps> = ({ board }) => {
  const renderCells = () => {
    const cells = [];

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cellValue = board[y][x];

        cells.push(
          <div
            key={`grid-cell-${x}-${y}`}
            className={
              cellValue === 0
                ? ''
                : getZIndexClass(GAME_FIELD_Z_INDEX.BOARD_BASE)
            }
          >
            <GridCell value={cellValue} x={x} y={y} />
          </div>
        );
      }
    }

    return cells;
  };

  return <>{renderCells()}</>;
};
