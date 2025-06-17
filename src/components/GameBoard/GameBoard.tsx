import React from 'react';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type { GameBoardProps } from '@/types/game';

import { Block } from '../Block';
import { GridCell } from '../GridCell';
import { Queue } from '../Queue';
import { ScoreDisplay } from '../ScoreDisplay';
import { Timeline } from '../Timeline';

/**
 * GameBoard represents the main 16x10 playing field
 * Renders the static board cells, current falling block, and timeline
 */
export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentBlock,
  blockPosition,
  timeline,
  queue,
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
    <div className="bg-game-background relative mt-8 inline-block">
      <div
        className="absolute top-0 z-10"
        style={{ left: 'calc(-3 * var(--spacing-block-size))' }}
      >
        <Queue queue={queue} />
      </div>
      <div
        className={`bg-game-background border-game-grid relative grid gap-0 border`}
        style={{
          width: `calc(${BOARD_WIDTH} * var(--spacing-block-size))`,
          height: `calc(${BOARD_HEIGHT} * var(--spacing-block-size))`,
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, var(--spacing-block-size))`,
          gridTemplateRows: `repeat(${BOARD_HEIGHT}, var(--spacing-block-size))`,
        }}
      >
        {renderBoard()}

        {currentBlock && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: `calc(${blockPosition.x} * var(--spacing-block-size))`,
              top: `calc(${blockPosition.y} * var(--spacing-block-size))`,
            }}
          >
            <Block block={currentBlock} />
          </div>
        )}

        <Timeline timeline={timeline} />
      </div>
      <div
        className="absolute top-0 right-0 z-10"
        style={{
          transform: 'translateX(calc(100% + var(--spacing-block-size)))',
        }}
      >
        <ScoreDisplay score={100} timeRemaining={60} />
      </div>
    </div>
  );
};
