import React from 'react';
import { Palette, Dimension } from '../../constants';

const Grid: React.FC = () => {
  return (
    <g>
      {[...new Array(Dimension.GRID_COLUMNS + 1)].map((_, i) => (
        <line
          key={i}
          x1={i * Dimension.SQUARE_SIZE}
          y1={0}
          x2={i * Dimension.SQUARE_SIZE}
          y2={Dimension.GRID_HEIGHT}
          stroke={Palette.GRID_STROKE}
          strokeWidth={Dimension.GRID_STROKE_WIDTH}
        />
      ))}
      {[...new Array(Dimension.GRID_ROWS + 1)].map((_, i) => (
        <line
          key={i}
          x1={0}
          y1={i * Dimension.SQUARE_SIZE}
          x2={Dimension.GRID_WIDTH}
          y2={i * Dimension.SQUARE_SIZE}
          stroke={Palette.GRID_STROKE}
          strokeWidth={Dimension.GRID_STROKE_WIDTH}
        />
      ))}
    </g>
  );
};

export default Grid;
