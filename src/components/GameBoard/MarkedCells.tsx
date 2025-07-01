import { useMemo } from 'react';

import { GAME_FIELD_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import type { Square, Timeline } from '@/types/game';

export interface MarkedCellsProps {
  timeline: Timeline;
  markedCells: Square[];
}

export const MarkedCells: React.FC<MarkedCellsProps> = ({
  timeline,
  markedCells,
}) => {
  const percent = useMemo(() => {
    return timeline.timer / timeline.sweepInterval;
  }, [timeline]);

  return markedCells.map(cell => {
    const width = cell.x === timeline.x ? percent : 1;
    return (
      <div
        key={`marked-cell-${cell.x}-${cell.y}`}
        className="bg-block-marked h-block-size border-game-grid absolute border border-solid"
        style={{
          left: `calc(${cell.x} * var(--spacing-block-size) + 1px)`,
          top: `calc(${cell.y} * var(--spacing-block-size) + 1px)`,
          width: `calc(${width} * var(--spacing-block-size))`,
          ...getZIndexStyle(GAME_FIELD_Z_INDEX.GAME_EFFECTS),
        }}
      />
    );
  });
};
