import { GAME_FIELD_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import type { Square } from '@/types/game';

export interface DetectedPatternsProps {
  patterns: Square[];
}

export const DetectedPatterns: React.FC<DetectedPatternsProps> = ({
  patterns,
}) => {
  return patterns.map(pattern => {
    return (
      <div
        key={`detected-pattern-${pattern.x}-${pattern.y}`}
        className="absolute border-2 border-solid border-white"
        style={{
          left: `calc(${pattern.x} * var(--spacing-block-size))`,
          top: `calc(${pattern.y} * var(--spacing-block-size))`,
          width: `calc(2 * var(--spacing-block-size))`,
          height: `calc(2 * var(--spacing-block-size))`,
          backgroundColor:
            pattern.color === 1
              ? 'var(--color-block-light-detected)'
              : 'var(--color-block-dark-detected)',
          ...getZIndexStyle(GAME_FIELD_Z_INDEX.GAME_EFFECTS),
        }}
      />
    );
  });
};
