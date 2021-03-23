import React from 'react';
import Cell from '../Cell';
import { Block as BlockType } from '../../game/types';
import { Dimension } from '../../constants';

export type BlockProps = {
  x: number;
  y: number;
  block: BlockType;
  dropped?: Boolean;
};

const Block: React.FC<BlockProps> = ({ x, y, block, dropped }) => {
  return (
    <g>
      {block.map((col, i) =>
        col.map((c, j) => (
          <Cell
            key={i * 2 + j}
            x={x + i * Dimension.SQUARE_SIZE}
            y={y + j * Dimension.SQUARE_SIZE}
            color={block[i][j]}
          />
        )),
      )}
    </g>
  );
};

export default Block;
