import React from 'react';

import type {
  GameBoard as GameBoardType,
  Block as BlockType,
  Position,
  Timeline as TimelineType,
} from '@/types/game';

import { GameBoard } from '../GameBoard';
import { Queue } from '../Queue';
import { ScoreDisplay } from '../ScoreDisplay';

export interface GameScreenProps {
  board: GameBoardType;
  currentBlock: BlockType;
  blockPosition: Position;
  timeline: TimelineType;
  queue: BlockType[];
  score?: number;
  timeRemaining?: number;
}

/**
 * GameScreen represents the complete game interface layout
 * Handles positioning of the queue, game board, and score display
 */
export const GameScreen: React.FC<GameScreenProps> = ({
  board,
  currentBlock,
  blockPosition,
  timeline,
  queue,
  score = 100,
  timeRemaining = 60,
}) => {
  return (
    <div className="bg-game-background relative mt-8 inline-block">
      {/* Queue positioned to the left */}
      <div
        className="absolute top-0 z-10"
        style={{ left: 'calc(-3 * var(--spacing-block-size))' }}
      >
        <Queue queue={queue} />
      </div>

      {/* Main game board */}
      <GameBoard
        board={board}
        currentBlock={currentBlock}
        blockPosition={blockPosition}
        timeline={timeline}
      />

      {/* Score display positioned to the right */}
      <div
        className="absolute top-0 right-0 z-10"
        style={{
          transform: 'translateX(calc(100% + var(--spacing-block-size)))',
        }}
      >
        <ScoreDisplay score={score} timeRemaining={timeRemaining} />
      </div>
    </div>
  );
};
