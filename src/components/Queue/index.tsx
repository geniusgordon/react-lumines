import React from 'react';
import Block from '../Block';
import { Block as BlockType } from '../../game/types';
import { Dimension } from '../../constants';

export type QueueProps = {
  queue: BlockType[];
};

const Queue: React.FC<QueueProps> = ({ queue }) => {
  return (
    <g>
      {queue.map((block, i) => (
        <Block key={i} x={0} y={i * Dimension.SQUARE_SIZE * 3} block={block} />
      ))}
    </g>
  );
};

export default Queue;
