import type { Square } from '@/types/game';

export interface MarkedCellsProps {
  markedCells: Square[];
}

export const MarkedCells: React.FC<MarkedCellsProps> = ({ markedCells }) => {
  return markedCells.map(cell => {
    return (
      <div
        key={`${cell.x}-${cell.y}`}
        className="absolute z-25"
        style={{
          left: `calc(${cell.x} * var(--spacing-block-size))`,
          top: `calc(${cell.y} * var(--spacing-block-size))`,
          width: `var(--spacing-block-size)`,
          height: `var(--spacing-block-size)`,
          backgroundColor: 'var(--color-block-marked)',
        }}
      />
    );
  });
};
