import React from 'react';
import Grid from '../Grid';
import Column from '../Column';
import { isMatchedBlock } from '../../game/grid';
import { Grid as GridType } from '../../game/types';
import { Dimension } from '../../constants';

export type FieldProps = {
  grid: GridType;
};

const Field: React.FC<FieldProps> = ({ grid }) => {
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
    </g>
  );
};

export default Field;
