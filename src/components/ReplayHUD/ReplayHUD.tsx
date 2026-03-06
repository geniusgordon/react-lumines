import React from 'react';

import type { GameState } from '@/types/game';
import type { ReplayAnalytics } from '@/types/replay';

import { Button } from '../ui/button';

import { BranchControls } from './BranchControls';
import { MetricsPanel } from './MetricsPanel';
import { ScoreTimeline } from './ScoreTimeline';

interface ReplayHUDProps {
  gameState: GameState;
  analytics: ReplayAnalytics;
  currentFrame: number;
  totalFrames: number;
  sourceReplayId: string;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
}

export const ReplayHUD: React.FC<ReplayHUDProps> = ({
  gameState,
  analytics,
  currentFrame,
  totalFrames,
  sourceReplayId,
  showHeatmap,
  onToggleHeatmap,
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
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Overlay
        </p>
        <Button
          size="sm"
          variant={showHeatmap ? 'secondary' : 'outline'}
          className="w-full text-xs"
          onClick={onToggleHeatmap}
        >
          {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
        </Button>
      </div>
    </div>
  );
};
