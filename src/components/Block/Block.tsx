import React from 'react';
import type { BlockProps } from '../../types/game';
import { GridCell } from '../GridCell';

/**
 * Block represents a 2x2 tetromino piece
 * Consists of 4 GridCells arranged in a 2x2 pattern
 * Can be positioned anywhere on the board
 */
export const Block: React.FC<BlockProps> = ({
  block,
  position,
  className = '',
}) => {
  const { pattern } = block;

  const getBlockClasses = () => {
    const baseClasses =
      'pointer-events-none transition-all duration-100 ease-in-out';
    const droppingClasses = className.includes('dropping')
      ? 'animate-[block-drop_0.2s_ease-out]'
      : '';
    const ghostClasses = className.includes('ghost') ? 'opacity-30 z-[5]' : '';

    return `${baseClasses} ${droppingClasses} ${ghostClasses} ${className}`.trim();
  };

  return (
    <div
      className={getBlockClasses()}
      style={{
        position: 'absolute',
        left: `${position.x * 24}px`, // 24px cell, no gaps
        top: `${position.y * 24}px`,
        width: '48px', // 2 cells * 24px
        height: '48px',
        zIndex: 10, // Above the game board
      }}
    >
      <div className="grid h-12 w-12 grid-cols-2 grid-rows-2 gap-0">
        {pattern.map((row, rowIndex) =>
          row.map((cellValue, colIndex) => (
            <GridCell
              key={`${rowIndex}-${colIndex}`}
              value={cellValue}
              x={position.x + colIndex}
              y={position.y + rowIndex}
              className={`static ${className.includes('ghost') ? 'border-dashed' : ''}`}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Block;
