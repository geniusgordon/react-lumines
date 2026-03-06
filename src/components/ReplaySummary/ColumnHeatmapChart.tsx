import React from 'react';

import type { ColumnHeatmap } from '@/types/replay';

interface ColumnHeatmapChartProps {
  heatmap: ColumnHeatmap;
}

export const ColumnHeatmapChart: React.FC<ColumnHeatmapChartProps> = ({ heatmap }) => {
  const { counts, max } = heatmap;
  const barWidth = 8;
  const gap = 2;
  const height = 48;
  const totalWidth = counts.length * (barWidth + gap) - gap;

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        Column Activity
      </p>
      <div className="flex justify-center">
        <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`} className="overflow-visible">
          {counts.map((count, col) => {
            const opacity = max > 0 ? 0.15 + (count / max) * 0.85 : 0.15;
            const barH = max > 0 ? Math.max(2, (count / max) * height) : 2;
            return (
              <rect
                key={col}
                x={col * (barWidth + gap)}
                y={height - barH}
                width={barWidth}
                height={barH}
                fill="var(--primary)"
                opacity={opacity}
                rx={1}
              />
            );
          })}
        </svg>
      </div>
      <div className="text-muted-foreground mt-1 flex justify-between text-xs">
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  );
};
