import { X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { getZIndexStyle, UI_Z_INDEX } from '@/constants/zIndex';
import type { ReplayAnalytics } from '@/types/replay';

import { ColumnHeatmapChart } from './ColumnHeatmapChart';
import { ScoreDistributionBar } from './ScoreDistributionBar';
import { StatsGrid } from './StatsGrid';

interface ReplaySummaryProps {
  analytics: ReplayAnalytics;
  finalScore: number;
  playerName?: string;
  onClose: () => void;
}

export const ReplaySummary: React.FC<ReplaySummaryProps> = ({
  analytics,
  finalScore,
  playerName,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={getZIndexStyle(UI_Z_INDEX.SYSTEM_OVERLAY)}
      onClick={onClose}
    >
      <div
        className="border-border bg-background w-full max-w-md rounded-xl border p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-xl font-bold">Game Summary</h2>
            {playerName && (
              <p className="text-muted-foreground text-sm">{playerName}</p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>

        <div className="space-y-5">
          <StatsGrid analytics={analytics} finalScore={finalScore} />
          <ScoreDistributionBar distribution={analytics.scoreDistribution} />
          <ColumnHeatmapChart heatmap={analytics.columnHeatmap} />
        </div>
      </div>
    </div>
  );
};
