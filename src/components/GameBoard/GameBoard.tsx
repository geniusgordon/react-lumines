import React from 'react';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type { GameState } from '@/types/game';

import { BoardGrid } from '../BoardGrid';
import { CurrentBlock } from '../CurrentBlock';
import { Timeline as TimelineComponent } from '../Timeline';

import { DetectedPatterns } from './DetectedPatterns';

export interface GameBoardProps {
  gameState: GameState;
}

/**
 * GameBoard represents the core 16x10 playing field
 * Contains the grid, current falling block, and timeline
 */
export const GameBoard: React.FC<GameBoardProps> = ({ gameState }) => {
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
      <BoardGrid board={gameState.board} />

      <DetectedPatterns patterns={gameState.detectedPatterns} />

      <CurrentBlock
        currentBlock={gameState.currentBlock}
        blockPosition={gameState.blockPosition}
      />

      <TimelineComponent timeline={gameState.timeline} />
    </div>
  );
};
