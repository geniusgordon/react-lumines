import React from 'react';
import Cell, { CellProps } from '../Cell';

export type ColumnProps = {
  column: Array<CellProps | null>;
  x: number;
};

const Column: React.FC<ColumnProps> = ({ column }) => {
  return (
    <g>{column.map((cell, i) => (cell ? <Cell key={i} {...cell} /> : null))}</g>
  );
};

export default Column;
