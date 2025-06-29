import React, { useMemo } from 'react';

import { GAME_FIELD_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import type { Timeline as TimelineType } from '@/types/game';

export interface TimelineProps {
  timeline: TimelineType;
}

/**
 * Timeline represents the vertical sweep line that triggers rectangle clearing
 * Renders a vertical line that moves from left to right across the board
 */
export const Timeline: React.FC<TimelineProps> = ({ timeline }) => {
  const interpolatedX = useMemo(() => {
    const percent = timeline.timer / timeline.sweepInterval;
    return timeline.x + percent;
  }, [timeline]);

  if (!timeline.active) {
    return null;
  }

  return (
    <div
      className="bg-game-timeline absolute top-0 h-full w-0.5"
      style={{
        left: `calc(${interpolatedX} * var(--spacing-block-size))`,
        ...getZIndexStyle(GAME_FIELD_Z_INDEX.ACTIVE_ELEMENTS),
      }}
    >
      <div className="border-game-timeline -top-block-size h-block-size absolute right-0 flex w-12 items-center justify-end border-2 border-solid bg-black pr-2">
        <div className="text-game-text">{timeline.holdingScore}</div>
      </div>
      <div className="-top-block-size absolute left-0 translate-x-0.5">
        <div className="h-block-size w-block-size">
          <svg width="100%" height="100%" viewBox="0 0 20 20">
            <path
              d="M 0 0 L 10 10 L 0 20"
              stroke="var(--color-game-timeline)"
              strokeWidth="1"
              fill="black"
            />
          </svg>
        </div>
      </div>
      <div className="to-game-timeline absolute top-0 right-0 h-full w-8 bg-gradient-to-r from-transparent opacity-10" />
    </div>
  );
};
