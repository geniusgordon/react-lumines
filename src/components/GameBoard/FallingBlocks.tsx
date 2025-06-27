import { Fragment } from 'react';

import { TIMER_CONFIG } from '@/constants/gameConfig';
import type { FallingColumn } from '@/types/game';

import { GridCell } from '../GridCell/GridCell';

interface FallingBlocksProps {
  fallingColumns: FallingColumn[];
}

const FallingBlocks = ({ fallingColumns }: FallingBlocksProps) => {
  return fallingColumns.map(column => {
    const percent = column.timer / TIMER_CONFIG.FALLING_CELL_INTERVAL;
    return (
      <Fragment key={column.x}>
        {column.cells.map(cell => (
          <div
            key={`falling-block-${cell.id}`}
            className="absolute z-20"
            style={{
              top: `calc(${cell.y + percent} * var(--spacing-block-size) + 1px)`,
              left: `calc(${column.x} * var(--spacing-block-size) + 1px)`,
            }}
          >
            <GridCell value={cell.color} x={column.x} y={cell.y} />
          </div>
        ))}
      </Fragment>
    );
  });
};

export default FallingBlocks;
