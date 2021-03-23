import React from 'react';
import Cell from '../Cell';
import { Column as ColumnType } from '../../game/types';
import { Dimension } from '../../constants';

export type ColumnProps = {
  column: ColumnType;
  x: number;
};

const Column: React.FC<ColumnProps> = ({ column, x }) => {
  return (
    <g>
      {column.map((cell, i) =>
        cell ? (
          <Cell
            key={i}
            x={x}
            y={i * Dimension.SQUARE_SIZE}
            color={cell.color}
            scanned={cell.scanned}
          />
        ) : null,
      )}
    </g>
  );
};

export default Column;
