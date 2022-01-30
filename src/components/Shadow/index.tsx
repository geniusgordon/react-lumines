import React from 'react';
import { Dimension, Palette } from '../../constants';

export type ShadowProps = {
  x: number;
};

const Shadow: React.FC<ShadowProps> = ({ x }) => {
  const y = Dimension.SQUARE_SIZE;
  const width = Dimension.SQUARE_SIZE * 2;
  const height = Dimension.GRID_HEIGHT - Dimension.SQUARE_SIZE;

  return (
    <g>
      <path
        d={`M${x},${y} L${x},${y + height} L${x + width},${y + height}, L${
          x + width
        },${y}`}
        stroke={Palette.SHADOW}
        strokeWidth={Dimension.GRID_STROKE_WIDTH * 3}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={Palette.SHADOW}
        fillOpacity={0.3}
      />
    </g>
  );
};

export default Shadow;
