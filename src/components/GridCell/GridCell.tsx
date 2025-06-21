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

    // Color classes based on cell value
    let colorClasses = '';
    if (value === 0) {
      colorClasses = 'bg-game-empty opacity-80';
    } else if (value === 1) {
      colorClasses = 'bg-block-white opacity-100';
    } else if (value === 2) {
      colorClasses = 'bg-block-orange opacity-100';
    } else if (value === -1) {
      // Marked light block - flashing/pulsing effect
      colorClasses =
        'bg-block-white opacity-75 animate-pulse ring-2 ring-game-timeline ring-inset';
    } else if (value === -2) {
      // Marked dark block - flashing/pulsing effect
      colorClasses =
        'bg-block-orange opacity-75 animate-pulse ring-2 ring-game-timeline ring-inset';
    }

    return `${baseClasses} ${colorClasses}`.trim();
  };

  return (
    <div className={getCellClass()} data-x={x} data-y={y} data-value={value} />
  );
};
