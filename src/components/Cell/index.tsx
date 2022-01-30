import React from 'react';
import { Color } from '../../game/types';
import { Dimension, Palette } from '../../constants';

export type CellProps = {
  x: number;
  y: number;
  color: Color;
  matched?: Boolean;
  scanned?: Boolean;
};

const Cell: React.FC<CellProps> = ({ x, y, color, matched, scanned }) => {
  const fill = scanned
    ? Palette.SQUARE_SCANNED
    : color === Color.LIGHT
    ? matched
      ? Palette.SQUARE_LIGHT_MATCHED
      : Palette.SQUARE_LIGHT
    : matched
    ? Palette.SQUARE_DARK_MATCHED
    : Palette.SQUARE_DARK;
  const size = (matched ? 2 : 1) * Dimension.SQUARE_SIZE;
  const stroke = matched
    ? Palette.SQUARE_STROKE_MATCHED
    : Palette.SQUARE_STROKE;
  const strokeWidth = matched
    ? Dimension.SQUARE_STROKE_WIDTH_MATCHED
    : Dimension.SQUARE_STROKE_WIDTH;

  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};

export default Cell;
