import React from 'react';

import type { Block as BlockType } from '@/types/game';

import { GridCell } from '../GridCell';

export interface BlockProps {
  block: BlockType;
}

/**
 * Block represents a 2x2 tetromino piece
 * Consists of 4 GridCells arranged in a 2x2 pattern
 */
export const Block: React.FC<BlockProps> = ({ block }) => {
  const { pattern } = block;

  return (
    <div className="border-game-grid border-1">
      <div
        className="grid grid-cols-2 grid-rows-2 gap-0"
        style={{
          width: `calc(2 * var(--spacing-block-size))`,
          height: `calc(2 * var(--spacing-block-size))`,
        }}
      >
        {pattern.map((row, rowIndex) =>
          row.map((cellValue, colIndex) => (
            <GridCell
              key={`${rowIndex}-${colIndex}`}
              value={cellValue}
              x={colIndex}
              y={rowIndex}
            />
          ))
        )}
      </div>
    </div>
  );
};
