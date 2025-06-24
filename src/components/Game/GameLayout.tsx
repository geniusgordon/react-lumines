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
    <div
      className="bg-game-background gap-block-size relative flex flex-row"
      style={{
        paddingTop: 'calc(var(--spacing-block-size) * 2)',
        paddingBottom: 'calc(var(--spacing-block-size) * 2)',
      }}
    >
      <div style={{ width: 'calc(2 * var(--spacing-block-size))' }}>
        <Queue queue={gameState.queue} />
      </div>

      <div className="flex-1">
        <GameBoard gameState={gameState} />
      </div>

      <div style={{ width: 'calc(2 * var(--spacing-block-size))' }}>
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
