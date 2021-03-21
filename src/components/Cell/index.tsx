import React from 'react';
import { Color } from '../../game/types';

export type CellProps = {
  x: number;
  y: number;
  color: Color;
  scanned: Boolean;
};

const Cell: React.FC<CellProps> = ({ x, y, color, scanned }) => {
  return <div>{JSON.stringify({x, y, color, scanned})}</div>;
};

export default Cell;
