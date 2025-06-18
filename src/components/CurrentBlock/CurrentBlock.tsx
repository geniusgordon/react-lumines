import { BOARD_HEIGHT } from '@/constants/gameConfig';
import { type CurrentBlockProps } from '@/types/game';

import { Block } from '../Block';

export const CurrentBlock: React.FC<CurrentBlockProps> = ({
  currentBlock,
  blockPosition,
}) => {
  return (
    <div>
      <div
        className="border-block-shadow absolute z-10 border-1 border-t-0 border-solid"
        style={{
          left: `calc(${blockPosition.x} * var(--spacing-block-size))`,
          top: `calc(-1 * var(--spacing-block-size))`,
          width: `calc(2 * var(--spacing-block-size))`,
          height: `calc((${BOARD_HEIGHT + 1}) * var(--spacing-block-size))`,
        }}
      >
        <div className="bg-block-shadow h-full w-full opacity-30" />
      </div>
      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: `calc(${blockPosition.x} * var(--spacing-block-size))`,
          top: `calc(${blockPosition.y} * var(--spacing-block-size))`,
        }}
      >
        <Block block={currentBlock} />
      </div>
    </div>
  );
};
