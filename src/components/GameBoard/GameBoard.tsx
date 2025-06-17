import React from 'react';
import type { GameBoardProps } from '../../types/game';
import { GridCell } from '../GridCell';
import { Block } from '../Block';
import { Timeline } from '../Timeline';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../constants/gameConfig';

/**
 * GameBoard represents the main 16x10 playing field
 * Renders the static board cells, current falling block, and timeline
 */
export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentBlock,
  blockPosition,
  timeline,
  className = '',
}) => {
  const renderBoard = () => {
    const cells = [];

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cellValue = board[y][x];

        cells.push(
          <GridCell
            key={`${x}-${y}`}
            value={cellValue}
            x={x}
            y={y}
            className="relative"
          />
        );
      }
    }

    return cells;
  };

  const getGameBoardClasses = () => {
    const baseClasses =
      'bg-game-background border-2 border-game-ui rounded p-2 relative inline-block';
    let statusClasses = '';

    if (className.includes('playing')) {
      statusClasses = 'border-game-success';
    } else if (className.includes('paused')) {
      statusClasses = 'border-game-warning opacity-80';
    } else if (className.includes('game-over')) {
      statusClasses = 'border-game-error opacity-60';
    }

    return `${baseClasses} ${statusClasses} ${className}`.trim();
  };

  return (
    <div className={getGameBoardClasses()}>
      <div
        className={`bg-game-background border-game-grid relative grid h-60 w-96 gap-0 border`}
        style={{
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, 24px)`,
          gridTemplateRows: `repeat(${BOARD_HEIGHT}, 24px)`,
        }}
      >
        {renderBoard()}

        {currentBlock && (
          <Block
            block={currentBlock}
            position={blockPosition}
            className="current-block"
          />
        )}

        <Timeline timeline={timeline} />
      </div>
    </div>
  );
};

export default GameBoard;
