import React from 'react';

import type { GameStatus } from '@/types/game';

export interface ScoreDisplayProps {
  score: number;
  gameTimer: number; // frames remaining
  countdown: number;
  gameStatus: GameStatus;
}

/**
 * ScoreDisplay component shows game statistics like score and time
 * Positioned to the right of the game board
 */
export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  gameTimer,
  countdown,
  gameStatus,
}) => {
  // Convert frames to seconds for display
  const timeInSeconds = Math.ceil(gameTimer / 60);

  return (
    <div className="text-game-text space-y-2">
      <div>
        <div className="text-xs">Time</div>
        {gameStatus === 'countdown' || gameStatus === 'countdownPaused' ? (
          <div className="animate-pulse text-4xl font-bold">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        ) : (
          <div className="text-4xl font-bold">{timeInSeconds}</div>
        )}
      </div>
      <div className="mt-block-size">
        <div className="text-xs">Score</div>
        <div className="text-4xl font-bold">{score}</div>
      </div>
    </div>
  );
};
