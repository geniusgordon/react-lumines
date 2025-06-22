import React from 'react';

import type { GameState } from '@/types/game';

import { GameBoard } from '../GameBoard';
import { Queue } from '../Queue';
import { ScoreDisplay } from '../ScoreDisplay';

import { Countdown } from './Countdown';

export interface GameScreenProps {
  gameState: GameState;
}

/**
 * GameScreen represents the complete game interface layout
 * Handles positioning of the queue, game board, and score display
 */
export const GameScreen: React.FC<GameScreenProps> = ({ gameState }) => {
  return (
    <div
      className="bg-game-background relative inline-block"
      style={{
        marginTop: 'calc(var(--spacing-block-size) * 2)',
      }}
    >
      {/* Queue positioned to the left */}
      <div
        className="absolute top-0 z-10"
        style={{ left: 'calc(-3 * var(--spacing-block-size))' }}
      >
        <Queue queue={gameState.queue} />
      </div>

      {/* Main game board */}
      <GameBoard gameState={gameState} />

      {/* Score display positioned to the right */}
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

      <Countdown gameState={gameState} />
    </div>
  );
};
