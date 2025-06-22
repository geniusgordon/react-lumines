import React from 'react';

import type { GameState } from '@/types/game';

import { GameBoard } from '../GameBoard';
import { Queue } from '../Queue';
import { ScoreDisplay } from '../ScoreDisplay';

export interface GameLayoutProps {
  gameState: GameState;
}

/**
 * GameLayout represents the complete game interface layout
 * Handles positioning of the queue, game board, and score display
 */
export const GameLayout: React.FC<GameLayoutProps> = ({ gameState }) => {
  return (
    <div className="bg-game-background relative inline-block">
      <div
        className="absolute top-0 z-10"
        style={{ left: 'calc(-3 * var(--spacing-block-size))' }}
      >
        <Queue queue={gameState.queue} />
      </div>

      <GameBoard gameState={gameState} />

      <div
        className="absolute top-0 right-0 z-10"
        style={{
          transform: 'translateX(calc(100% + var(--spacing-block-size)))',
        }}
      >
        <ScoreDisplay
          score={gameState.score}
          gameTimer={gameState.gameTimer}
          countdown={gameState.countdown}
          gameStatus={gameState.status}
        />
      </div>
    </div>
  );
};
