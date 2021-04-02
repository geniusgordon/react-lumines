import React from 'react';
import Grid from '../Grid';
import Cell, { CellProps } from '../Cell';
import { isMatchedBlock } from '../../game/grid';
import { Grid as GridType, DetachedBlock } from '../../game/types';
import { Dimension } from '../../constants';

export type FieldProps = {
  grid: GridType;
  detachedBlocks: DetachedBlock[];
};

const Field: React.FC<FieldProps> = ({ grid, detachedBlocks }) => {
  const { cells, matchedCells, scannedCells } = React.useMemo(() => {
    const cells: CellProps[] = [];
    const matchedCells: CellProps[] = [];
    const scannedCells: CellProps[] = [];

    grid.forEach(column => {
      column.forEach(cell => {
        if (!cell) {
          return;
        }
        const c: CellProps = {
          x: cell.col * Dimension.SQUARE_SIZE,
          y: cell.row * Dimension.SQUARE_SIZE,
          color: cell.color,
        };
        cells.push(c);
        if (isMatchedBlock(cell)) {
          matchedCells.push({ ...c, matched: true });
        }
        if (cell.scanned) {
          scannedCells.push({ ...c, scanned: true });
        }
      });
    });

    return { cells, matchedCells, scannedCells };
  }, [grid]);

  return (
    <g>
      <Grid />
      {cells.map(cell => (
        <Cell key={`normal-${cell.x}-${cell.y}`} {...cell} />
      ))}
      {matchedCells.map(cell => (
        <Cell key={`matched-${cell.x}-${cell.y}`} {...cell} />
      ))}
      {scannedCells.map(cell => (
        <Cell key={`scanned-${cell.x}-${cell.y}`} {...cell} />
      ))}
      {detachedBlocks.map(b => (
        <Cell key={`${b.x}-${b.y}-${b.color}`} {...b} />
      ))}
    </g>
  );
};

export default Field;
