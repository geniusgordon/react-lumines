import React from 'react';
import type { ScoreDisplayProps } from '../../types/game';

/**
 * ScoreDisplay component shows game statistics like score and time
 * Positioned to the right of the game board
 */
export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  timeRemaining,
}) => {
  return (
    <div className="text-game-text space-y-2">
      <div>
        <div className="text-xs">Time</div>
        <div className="text-2xl">{timeRemaining}</div>
      </div>
      <div className="mt-block-size">
        <div className="text-xs">Score</div>
        <div className="text-2xl">{score}</div>
      </div>
    </div>
  );
};
