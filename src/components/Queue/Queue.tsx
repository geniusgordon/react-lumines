import React from 'react';

import type { QueueProps } from '../../types/game';
import { Block } from '../Block';

/**
 * Queue component displays the upcoming blocks in preview
 * Shows multiple blocks in a vertical layout for player planning
 */
export const Queue: React.FC<QueueProps> = ({ queue }) => {
  return (
    <div className="space-y-block-size flex flex-col">
      {queue.map((block, index) => (
        <Block key={`queue-${index}`} block={block} />
      ))}
    </div>
  );
};
