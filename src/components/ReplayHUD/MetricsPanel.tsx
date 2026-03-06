import React from 'react';

import type { GameState } from '@/types/game';
import { computeChainLengths, computeComboGroups, type ComboGroup } from '@/utils/trainingMetrics';

interface MetricsPanelProps {
  gameState: GameState;
}

function ComboGroupRow({ group }: { group: ComboGroup }) {
  const colorLabel = group.color === 1 ? 'Light' : 'Dark';
  const colorClass = group.color === 1 ? 'text-foreground' : 'text-muted-foreground';
  const pct = Math.round(group.efficiency * 100);
  const effColor =
    group.efficiency >= 0.4 ? 'text-success' : group.efficiency >= 0.25 ? 'text-warning' : 'text-destructive';
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={`font-semibold ${colorClass}`}>{colorLabel}</span>
      <span className="text-muted-foreground tabular-nums">
        {group.patternCount}p / {group.cellCount}c
      </span>
      <span className={`font-mono text-xs tabular-nums ${effColor}`}>{pct}%</span>
    </div>
  );
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ gameState }) => {
  const chains = computeChainLengths(gameState.detectedPatterns);
  const groups = computeComboGroups(gameState.detectedPatterns);
  const dominantColor =
    chains.light > chains.dark ? 'light' : chains.dark > chains.light ? 'dark' : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Chain lengths */}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Chains
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs ${dominantColor === 'light' ? 'text-warning font-bold' : 'text-foreground'}`}>
              Light
            </span>
            <span className="font-mono text-sm tabular-nums">{chains.light}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${dominantColor === 'dark' ? 'text-warning font-bold' : 'text-muted-foreground'}`}>
              Dark
            </span>
            <span className="font-mono text-sm tabular-nums">{chains.dark}</span>
          </div>
        </div>
      </div>

      {/* Combo groups */}
      {groups.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
            Combos
          </p>
          <div className="space-y-1">
            {groups.map((g, i) => (
              <ComboGroupRow key={i} group={g} />
            ))}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">p=patterns c=cells</p>
        </div>
      )}
    </div>
  );
};
