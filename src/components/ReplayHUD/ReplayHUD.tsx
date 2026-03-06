import React from 'react';

import type { GameState } from '@/types/game';
import type { ReplayAnalytics } from '@/types/replay';

import { BranchControls } from './BranchControls';
import { MetricsPanel } from './MetricsPanel';
import { ScoreTimeline } from './ScoreTimeline';

interface ReplayHUDProps {
  gameState: GameState;
  analytics: ReplayAnalytics;
  currentFrame: number;
  totalFrames: number;
  sourceReplayId: string;
}

export const ReplayHUD: React.FC<ReplayHUDProps> = ({
  gameState,
  analytics,
  currentFrame,
  totalFrames,
  sourceReplayId,
}) => {
  return (
    <div className="border-border bg-card/90 text-foreground flex w-40 flex-col gap-4 rounded-lg border p-3">
      <ScoreTimeline
        scoreTimeline={analytics.scoreTimeline}
        keyMoments={analytics.keyMoments}
        currentFrame={currentFrame}
        totalFrames={totalFrames}
      />
      <MetricsPanel gameState={gameState} />
      <BranchControls
        gameState={gameState}
        sourceReplayId={sourceReplayId}
        currentFrame={currentFrame}
      />
    </div>
  );
};
