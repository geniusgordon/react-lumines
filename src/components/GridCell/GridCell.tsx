import React from 'react';
import type { GridCellProps } from '../../types/game';

/**
 * GridCell represents a single cell in the game board
 * Each cell can be empty (0), light (1), or dark (2)
 * Supports timeline highlighting for sweep animation
 */
export const GridCell: React.FC<GridCellProps> = ({ value, x, y }) => {
  const getCellClass = () => {
    const baseClasses =
      'w-block-size h-block-size border border-solid border-game-grid box-border transition-all duration-100 ease-in-out relative';

    // Color classes based on cell value
    let colorClasses = '';
    if (value === 0) {
      colorClasses = 'bg-game-empty opacity-80';
    } else if (value === 1) {
      colorClasses = 'bg-block-white opacity-100';
    } else {
      colorClasses = 'bg-block-orange opacity-100';
    }

    return `${baseClasses} ${colorClasses}`.trim();
  };

  return (
    <div className={getCellClass()} data-x={x} data-y={y} data-value={value} />
  );
};
