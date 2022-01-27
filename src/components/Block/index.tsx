import React from 'react';
import Cell from '../Cell';
import { Block as BlockType } from '../../game/types';
import { Dimension, Speed } from '../../constants';

export type BlockProps = {
  x: number;
  y: number;
  block: BlockType;
  speed?: number;
};

const Block: React.FC<BlockProps> = ({ x, y, block, speed = 0 }) => {
  const dropped = speed > Speed.DROP_SLOW;
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