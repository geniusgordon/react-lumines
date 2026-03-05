import React from 'react';

import type { GameState } from '@/types/game';
import {
  computeChainLengths,
  computeComboGroups,
  type ComboGroup,
} from '@/utils/trainingMetrics';

interface TrainingHUDProps {
  gameState: GameState;
}

function EfficiencyBar({ efficiency }: { efficiency: number }) {
  const color =
    efficiency >= 0.4
      ? 'text-success'
      : efficiency >= 0.25
        ? 'text-warning'
        : 'text-destructive';
  const pct = Math.round(efficiency * 100);
  return <span className={`font-mono text-xs ${color}`}>{pct}%</span>;
}

function ComboGroupRow({ group }: { group: ComboGroup }) {
  const colorLabel = group.color === 1 ? 'Light' : 'Dark';
  const colorClass = group.color === 1 ? 'text-foreground' : 'text-muted-foreground';
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={`font-semibold ${colorClass}`}>{colorLabel}</span>
      <span className="text-muted-foreground">
        {group.patternCount}p / {group.cellCount}c
      </span>
      <EfficiencyBar efficiency={group.efficiency} />
    </div>
  );
}

export const TrainingHUD: React.FC<TrainingHUDProps> = ({ gameState }) => {
  const chains = computeChainLengths(gameState.detectedPatterns);
  const groups = computeComboGroups(gameState.detectedPatterns);
  const undoCount = gameState.undoStack.length;

  const dominantColor =
    chains.light > chains.dark
      ? 'light'
      : chains.dark > chains.light
        ? 'dark'
        : null;

  return (
    <div className="flex w-36 flex-col gap-3 rounded-lg border border-border bg-card/90 p-3 text-foreground">
      {/* Chain lengths */}
      <div>
        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Chains
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${dominantColor === 'light' ? 'font-bold text-warning' : 'text-foreground'}`}
            >
              Light
            </span>
            <span className="font-mono text-sm">{chains.light}</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${dominantColor === 'dark' ? 'font-bold text-warning' : 'text-muted-foreground'}`}
            >
              Dark
            </span>
            <span className="font-mono text-sm">{chains.dark}</span>
          </div>
        </div>
      </div>

      {/* Combo groups */}
      {groups.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Combos
          </p>
          <div className="space-y-1">
            {groups.map((g, i) => (
              <ComboGroupRow key={i} group={g} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">p=patterns c=cells</p>
        </div>
      )}

      {/* Undo indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">↩ Undo</span>
        <span
          className={`font-mono text-xs ${undoCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {undoCount}
        </span>
      </div>

      {/* Key hints */}
      <div className="space-y-0.5 border-t border-border pt-2 text-xs text-muted-foreground">
        <div>[A] Undo</div>
        <div>[S] Sweep</div>
      </div>
    </div>
  );
};
