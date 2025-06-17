import React from 'react';
import type { TimelineProps } from '../../types/game';

/**
 * Timeline represents the vertical sweep line that triggers rectangle clearing
 * Renders a vertical line that moves from left to right across the board
 */
const Timeline: React.FC<TimelineProps> = ({ timeline }) => {
  if (!timeline.active) {
    return null;
  }

  return (
    <div
      className={`bg-game-timeline absolute top-0 z-[15] h-full w-0.5 animate-[timeline-sweep_0.5s_ease-in-out]`}
      style={{
        left: `${timeline.x * 24}px`,
      }}
    >
      <div className="border-game-timeline -top-block-size h-block-size absolute right-0 flex w-12 items-center justify-end border-1 border-solid pr-1">
        <div className="text-game-text font-mono">
          {timeline.rectanglesCleared}
        </div>
      </div>
      <div className="-top-block-size absolute left-0 translate-x-0.5">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path
            d="M 0 0 L 12 12 L 0 24"
            stroke="var(--color-game-timeline)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>
      <div className="to-game-timeline absolute top-0 right-0 h-full w-8 bg-gradient-to-r from-transparent opacity-10" />
    </div>
  );
};

export default Timeline;
