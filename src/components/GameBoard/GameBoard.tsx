import React from 'react';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type {
  GameBoard as GameBoardType,
  Block as BlockType,
  Position,
  Timeline as TimelineType,
} from '@/types/game';

import { BoardGrid } from '../BoardGrid';
import { CurrentBlock } from '../CurrentBlock';
import { Timeline as TimelineComponent } from '../Timeline';

export interface GameBoardProps {
  board: GameBoardType;
  currentBlock: BlockType;
  blockPosition: Position;
  timeline: TimelineType;
}

/**
 * GameBoard represents the core 16x10 playing field
 * Contains the grid, current falling block, and timeline
 */
export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentBlock,
  blockPosition,
  timeline,
}) => {
  return (
    <div
      className={`bg-game-background border-game-grid relative grid gap-0 border`}
      style={{
        width: `calc(${BOARD_WIDTH} * var(--spacing-block-size))`,
        height: `calc(${BOARD_HEIGHT} * var(--spacing-block-size))`,
        gridTemplateColumns: `repeat(${BOARD_WIDTH}, var(--spacing-block-size))`,
        gridTemplateRows: `repeat(${BOARD_HEIGHT}, var(--spacing-block-size))`,
      }}
    >
      <BoardGrid board={board} />

      <CurrentBlock currentBlock={currentBlock} blockPosition={blockPosition} />

      <TimelineComponent timeline={timeline} />
    </div>
  );
};
