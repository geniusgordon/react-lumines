import React from 'react';
import Grid from '../Grid';
import Column from '../Column';
import Cell from '../Cell';
import { isMatchedBlock } from '../../game/grid';
import { Grid as GridType, DetachedBlock } from '../../game/types';
import { Dimension } from '../../constants';

export type FieldProps = {
  grid: GridType;
  detachedBlocks: DetachedBlock[];
};

const Field: React.FC<FieldProps> = ({ grid, detachedBlocks }) => {
  return (
    <g>
      <Grid />
      {grid.map((column, i) => (
        <Column
          key={`normal-${i}`}
          column={column.map((cell, j) =>
            cell && !isMatchedBlock(cell, i, j) && !cell.scanned
              ? {
                  x: i * Dimension.SQUARE_SIZE,
                  y: j * Dimension.SQUARE_SIZE,
                  color: cell.color,
                }
              : null,
          )}
          x={i * Dimension.SQUARE_SIZE}
        />
      ))}
      {grid.map((column, i) => (
        <Column
          key={`matched-${i}`}
          column={column.map((cell, j) =>
            cell && isMatchedBlock(cell, i, j)
              ? {
                  x: i * Dimension.SQUARE_SIZE,
                  y: j * Dimension.SQUARE_SIZE,
                  color: cell.color,
                  matched: true,
                }
              : null,
          )}
          x={i * Dimension.SQUARE_SIZE}
        />
      ))}
      {grid.map((column, i) => (
        <Column
          key={`scanned-${i}`}
          column={column.map((cell, j) =>
            cell && cell.scanned
              ? {
                  x: i * Dimension.SQUARE_SIZE,
                  y: j * Dimension.SQUARE_SIZE,
                  color: cell.color,
                  scanned: true,
                }
              : null,
          )}
          x={i * Dimension.SQUARE_SIZE}
        />
      ))}
      {detachedBlocks.map(b => (
        <Cell key={`${b.x}-${b.y}-${b.color}`} {...b} />
      ))}
    </g>
  );
};

export default Field;
