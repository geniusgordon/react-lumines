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
        <Block key={i} x={i * Dimension.SQUARE_SIZE * 3} y={0} block={block} />
      ))}
    </g>
  );
};

export default Queue;
