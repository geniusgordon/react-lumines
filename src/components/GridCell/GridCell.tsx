import React from 'react';

import type { CellValue } from '@/types/game';

export interface GridCellProps {
  value: CellValue;
  x: number;
  y: number;
}

/**
 * GridCell represents a single cell in the game board
 * Each cell can be empty (0), light (1), dark (2), or marked for clearing (negative values)
 * Supports timeline highlighting for sweep animation
 */
export const GridCell: React.FC<GridCellProps> = ({ value, x, y }) => {
  const getCellClass = () => {
    const baseClasses =
      'w-block-size h-block-size border border-solid border-game-grid box-border relative';

    let className = '';
    if (value === 0) {
      className = 'bg-game-empty';
    } else if (value === 1) {
      className = 'bg-block-light';
    } else if (value === 2) {
      className = 'bg-block-dark';
    }

    return `${baseClasses} ${className}`.trim();
  };

  return (
    <div className={getCellClass()} data-x={x} data-y={y} data-value={value} />
  );
};
