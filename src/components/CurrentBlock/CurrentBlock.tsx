import { BOARD_HEIGHT } from '@/constants/gameConfig';
import { GAME_FIELD_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import { type Block as BlockType, type Position } from '@/types/game';

import { Block as BlockComponent } from '../Block';

export interface CurrentBlockProps {
  currentBlock: BlockType;
  blockPosition: Position;
}

export const CurrentBlock: React.FC<CurrentBlockProps> = ({
  currentBlock,
  blockPosition,
}) => {
  return (
    <div>
      <div
        className="border-block-shadow bg-block-shadow/30 absolute border-1 border-t-0 border-solid"
        style={{
          left: `calc(${blockPosition.x} * var(--spacing-block-size))`,
          top: `calc(-1 * var(--spacing-block-size))`,
          width: `calc(2 * var(--spacing-block-size))`,
          height: `calc((${BOARD_HEIGHT + 1}) * var(--spacing-block-size))`,
          ...getZIndexStyle(GAME_FIELD_Z_INDEX.DROP_SHADOW),
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          left: `calc(${blockPosition.x} * var(--spacing-block-size))`,
          top: `calc(${blockPosition.y} * var(--spacing-block-size))`,
          ...getZIndexStyle(GAME_FIELD_Z_INDEX.ACTIVE_ELEMENTS),
        }}
      >
        <BlockComponent block={currentBlock} />
      </div>
    </div>
  );
};
