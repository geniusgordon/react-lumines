import React from 'react';
import type { GridCellProps } from '../../types/game';

/**
 * GridCell represents a single cell in the game board
 * Each cell can be empty (0), light (1), or dark (2)
 * Supports timeline highlighting for sweep animation
 */
export const GridCell: React.FC<GridCellProps> = ({
  value,
  x,
  y,
  className = '',
}) => {
  const getCellClass = () => {
    const baseClasses =
      'w-6 h-6 border border-solid border-game-grid box-border transition-all duration-100 ease-in-out relative';

    // Color classes based on cell value
    let colorClasses = '';
    if (value === 0) {
      colorClasses = 'bg-game-empty opacity-80';
    } else if (value === 1) {
      colorClasses = 'bg-block-white opacity-100';
    } else {
      colorClasses = 'bg-block-orange opacity-100';
    }

    const timelineClasses = className.includes('timeline')
      ? 'animate-[timeline-pulse_0.3s_ease-in-out] z-[1]'
      : '';

    return `${baseClasses} ${colorClasses} ${timelineClasses} ${className}`.trim();
  };

  return (
    <div className={getCellClass()} data-x={x} data-y={y} data-value={value} />
  );
};

export default GridCell;
