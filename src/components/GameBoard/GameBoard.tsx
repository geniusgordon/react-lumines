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
}) => {
  const renderBoard = () => {
    const cells = [];

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cellValue = board[y][x];

        cells.push(
          <GridCell key={`${x}-${y}`} value={cellValue} x={x} y={y} />
        );
      }
    }

    return cells;
  };

  return (
    <div className="bg-game-background relative inline-block pt-8">
      <div
        className={`bg-game-background border-game-grid relative grid h-60 w-96 gap-0 border`}
        style={{
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, var(--spacing-block-size))`,
          gridTemplateRows: `repeat(${BOARD_HEIGHT}, var(--spacing-block-size))`,
        }}
      >
        {renderBoard()}

        {currentBlock && (
          <Block block={currentBlock} position={blockPosition} />
        )}

        <Timeline timeline={timeline} />
      </div>
    </div>
  );
};

export default GameBoard;
