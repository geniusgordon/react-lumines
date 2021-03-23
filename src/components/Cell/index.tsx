import React from 'react';
import { Color } from '../../game/types';
import { Dimension, Palette } from '../../constants';

export type CellProps = {
  x: number;
  y: number;
  color: Color;
  scanned: Boolean;
};

const Cell: React.FC<CellProps> = ({ x, y, color, scanned }) => {
  const fill = scanned
    ? Palette.SQUARE_SCANNED
    : color === Color.LIGHT
    ? Palette.SQUARE_LIGHT
    : Palette.SQUARE_DARK;
  return (
    <rect
      x={x}
      y={y}
      width={Dimension.SQUARE_SIZE}
      height={Dimension.SQUARE_SIZE}
      fill={fill}
      stroke={Palette.SQUARE_STROKE}
      strokeWidth={Dimension.SQUARE_STROKE_WIDTH}
    />
  );
};

export default Cell;
