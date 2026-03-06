import React from 'react';

import type { ReplayAnalytics } from '@/types/replay';

interface StatsGridProps {
  analytics: ReplayAnalytics;
  finalScore: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ analytics, finalScore }) => {
  const efficiencyPct = Math.round(analytics.boardEfficiency * 100);
  const effColor =
    analytics.boardEfficiency >= 0.4
      ? 'text-success'
      : analytics.boardEfficiency >= 0.25
        ? 'text-warning'
        : 'text-destructive';

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-muted/30 rounded-lg p-3 text-center">
        <div className="text-foreground text-2xl font-bold tabular-nums">
          {finalScore.toLocaleString()}
        </div>
        <div className="text-muted-foreground text-xs">Final Score</div>
      </div>
      <div className="bg-muted/30 rounded-lg p-3 text-center">
        <div className="text-warning text-2xl font-bold tabular-nums">
          {analytics.peakChainLength}
        </div>
        <div className="text-muted-foreground text-xs">Peak Chain</div>
      </div>
      <div className="bg-muted/30 rounded-lg p-3 text-center">
        <div className={`text-2xl font-bold tabular-nums ${effColor}`}>
          {efficiencyPct}%
        </div>
        <div className="text-muted-foreground text-xs">Board Efficiency</div>
      </div>
      <div className="bg-muted/30 rounded-lg p-3 text-center">
        <div className="text-foreground text-2xl font-bold tabular-nums">
          {analytics.keyMoments.length}
        </div>
        <div className="text-muted-foreground text-xs">Key Moments</div>
      </div>
    </div>
  );
};
