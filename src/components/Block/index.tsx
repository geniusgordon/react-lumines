import React from 'react';
import Cell from '../Cell';
import { Block as BlockType, MovingObject } from '../../game/types';
import { Dimension, Speed } from '../../constants';

export interface BlockProps extends MovingObject {
  block: BlockType;
}

const Block: React.FC<BlockProps> = ({ x, y, block, speed }) => {
  const dropped = speed.y > Speed.DROP_SLOW;
  const _y = dropped
    ? y
    : Math.floor(y / Dimension.SQUARE_SIZE) * Dimension.SQUARE_SIZE;
  return (
    <g>
      {block.map((col, i) =>
        col.map((c, j) => (
          <Cell
            key={i * 2 + j}
            x={x + i * Dimension.SQUARE_SIZE}
            y={_y + j * Dimension.SQUARE_SIZE}
            color={block[i][j]}
          />
        )),
      )}
    </g>
  );
};

export default Block;
