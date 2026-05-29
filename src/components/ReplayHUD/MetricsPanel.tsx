import React from 'react';

import type { GameState } from '@/types/game';
import {
  computeChainLengths,
  summarizeCombosByColor,
  type ComboColorSummary,
} from '@/utils/trainingMetrics';

interface MetricsPanelProps {
  gameState: GameState;
}

function ComboRow({
  label,
  colorClass,
  summary,
}: {
  label: string;
  colorClass: string;
  summary: ComboColorSummary;
}) {
  if (summary.patternCount === 0) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-semibold ${colorClass}`}>{label}</span>
        <span className="text-muted-foreground/50 tabular-nums">—</span>
      </div>
    );
  }
  const pct = Math.round(summary.efficiency * 100);
  const effColor =
    summary.efficiency >= 0.4
      ? 'text-success'
      : summary.efficiency >= 0.25
        ? 'text-warning'
        : 'text-destructive';
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={`font-semibold ${colorClass}`}>{label}</span>
      <span className="text-muted-foreground tabular-nums">
        {summary.patternCount}p / {summary.cellCount}c
      </span>
      <span className={`text-xs tabular-nums ${effColor}`}>{pct}%</span>
    </div>
  );
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ gameState }) => {
  const chains = computeChainLengths(gameState.detectedPatterns);
  const combos = summarizeCombosByColor(gameState.detectedPatterns);
  const dominantColor =
    chains.light > chains.dark
      ? 'light'
      : chains.dark > chains.light
        ? 'dark'
        : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Chain lengths */}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Chains
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${dominantColor === 'light' ? 'text-warning font-bold' : 'text-foreground'}`}
            >
              Light
            </span>
            <span className="text-sm tabular-nums">{chains.light}</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${dominantColor === 'dark' ? 'text-warning font-bold' : 'text-muted-foreground'}`}
            >
              Dark
            </span>
            <span className="text-sm tabular-nums">{chains.dark}</span>
          </div>
        </div>
      </div>

      {/* Combo groups — always render both colours so the panel height is stable */}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Combos
        </p>
        <div className="space-y-1">
          <ComboRow
            label="Light"
            colorClass="text-foreground"
            summary={combos.light}
          />
          <ComboRow
            label="Dark"
            colorClass="text-muted-foreground"
            summary={combos.dark}
          />
        </div>
        <p className="text-muted-foreground mt-1 text-xs">p=patterns c=cells</p>
      </div>
    </div>
  );
};
