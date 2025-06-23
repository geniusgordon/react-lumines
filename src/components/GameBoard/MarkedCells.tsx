import { useMemo } from 'react';

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
        className="absolute z-25"
        style={{
          left: `calc(${cell.x} * var(--spacing-block-size))`,
          top: `calc(${cell.y} * var(--spacing-block-size))`,
          width: `calc(${width} * var(--spacing-block-size))`,
          height: `var(--spacing-block-size)`,
          backgroundColor: 'var(--color-block-marked)',
        }}
      />
    );
  });
};
