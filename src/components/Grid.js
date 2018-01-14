import React, { PureComponent } from 'react';
import { range } from '../utils';
import { dimensions, colors } from '../constants';

class Grid extends PureComponent {
  render() {
    return (
      <g>
        {range(dimensions.GRID_COLUMNS + 1).map(i => (
          <line
            key={i}
            x1={i * dimensions.SQUARE_SIZE}
            y1={2 * dimensions.SQUARE_SIZE}
            x2={i * dimensions.SQUARE_SIZE}
            y2={dimensions.GRID_HEIGHT}
            stroke={colors.GRID_STROKE}
            strokeWidth={dimensions.GRID_STROKE_WIDTH}
          />
        ))}
        {range(dimensions.GRID_ROWS - 1).map(i => (
          <line
            key={i}
            x1={0}
            y1={(i + 2) * dimensions.SQUARE_SIZE}
            x2={dimensions.GRID_WIDTH}
            y2={(i + 2) * dimensions.SQUARE_SIZE}
            stroke={colors.GRID_STROKE}
            strokeWidth={dimensions.GRID_STROKE_WIDTH}
          />
        ))}
      </g>
    );
  }
}

export default Grid;
