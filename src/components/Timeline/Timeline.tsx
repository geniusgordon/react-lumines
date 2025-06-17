import React from 'react';
import type { TimelineProps } from '../../types/game';

/**
 * Timeline represents the vertical sweep line that triggers rectangle clearing
 * Renders a vertical line that moves from left to right across the board
 */
const Timeline: React.FC<TimelineProps> = ({ timeline, className = '' }) => {
  if (!timeline.active) {
    return null;
  }

  return (
    <div
      className={`bg-game-timeline absolute top-0 z-[15] h-full w-1 animate-[timeline-sweep_0.5s_ease-in-out] ${className}`.trim()}
      style={{
        left: `${timeline.x * 24}px`,
        boxShadow:
          '0 0 20px rgb(from var(--color-game-timeline) r g b / 0.8), 0 0 40px rgb(from var(--color-game-timeline) r g b / 0.4)',
      }}
    />
  );
};

export default Timeline; 