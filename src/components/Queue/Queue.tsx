import React from 'react';

import type { Block as BlockType } from '@/types/game';

import { Block as BlockComponent } from '../Block';

export interface QueueProps {
  queue: BlockType[];
}

/**
 * Queue component displays the upcoming blocks in preview
 * Shows multiple blocks in a vertical layout for player planning
 */
export const Queue: React.FC<QueueProps> = ({ queue }) => {
  return (
    <div className="space-y-block-size flex flex-col">
      {queue.map((block, index) => (
        <BlockComponent key={`queue-${index}`} block={block} />
      ))}
    </div>
  );
};
