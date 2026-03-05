import React from 'react';

import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import { GAME_FIELD_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import type { Square } from '@/types/game';
import {
  computeCellContributions,
  computeColumnDistances,
} from '@/utils/trainingMetrics';

interface TrainingOverlayProps {
  detectedPatterns: Square[];
}

const COLUMN_DISTANCES = computeColumnDistances(BOARD_WIDTH);

/** Contribution badge: color intensity from 1 (faint) to 4 (bright) */
function contributionColor(count: number): string {
  const alpha = 0.15 + (count / 4) * 0.6; // 0.15 → 0.75
  return `rgba(255, 255, 100, ${alpha})`;
}

/** Column distance tint: 0 = neutral, 7 = orange-red */
function distanceColor(distance: number): string {
  const alpha = (distance / 7) * 0.25; // max 25% tint
  return `rgba(255, 100, 50, ${alpha})`;
}

export const TrainingOverlay: React.FC<TrainingOverlayProps> = ({
  detectedPatterns,
}) => {
  const contributions = computeCellContributions(detectedPatterns);

  return (
    <>
      {/* Column distance tint strips */}
      {Array.from({ length: BOARD_WIDTH }, (_, col) => (
        <div
          key={`col-dist-${col}`}
          className="pointer-events-none absolute"
          style={{
            left: `calc(${col} * var(--spacing-block-size))`,
            top: 0,
            width: 'var(--spacing-block-size)',
            height: `calc(${BOARD_HEIGHT} * var(--spacing-block-size))`,
            backgroundColor: distanceColor(COLUMN_DISTANCES[col]),
            ...getZIndexStyle(GAME_FIELD_Z_INDEX.GAME_EFFECTS - 1),
          }}
        />
      ))}

      {/* Per-cell contribution badges */}
      {Array.from(contributions.entries()).map(([key, count]) => {
        const [x, y] = key.split(',').map(Number);
        return (
          <div
            key={`contrib-${key}`}
            className="pointer-events-none absolute flex items-center justify-center font-bold"
            style={{
              left: `calc(${x} * var(--spacing-block-size))`,
              top: `calc(${y} * var(--spacing-block-size))`,
              width: 'var(--spacing-block-size)',
              height: 'var(--spacing-block-size)',
              backgroundColor: contributionColor(count),
              color: 'rgba(255, 255, 0, 0.9)',
              fontSize: '9px',
              ...getZIndexStyle(GAME_FIELD_Z_INDEX.GAME_EFFECTS + 1),
            }}
          >
            {count}
          </div>
        );
      })}
    </>
  );
};
