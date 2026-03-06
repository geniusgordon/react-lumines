import React from 'react';

interface ScoreDistributionBarProps {
  distribution: { small: number; medium: number; large: number };
}

export const ScoreDistributionBar: React.FC<ScoreDistributionBarProps> = ({ distribution }) => {
  const total = distribution.small + distribution.medium + distribution.large;
  if (total === 0) return null;

  const smallPct = (distribution.small / total) * 100;
  const mediumPct = (distribution.medium / total) * 100;
  const largePct = (distribution.large / total) * 100;

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        Score Events
      </p>
      <div className="flex h-4 w-full overflow-hidden rounded">
        {smallPct > 0 && (
          <div
            className="bg-primary/40 flex items-center justify-center text-xs"
            style={{ width: `${smallPct}%` }}
            title={`Small: ${distribution.small}`}
          />
        )}
        {mediumPct > 0 && (
          <div
            className="bg-primary/70 flex items-center justify-center text-xs"
            style={{ width: `${mediumPct}%` }}
            title={`Medium: ${distribution.medium}`}
          />
        )}
        {largePct > 0 && (
          <div
            className="bg-primary flex items-center justify-center text-xs"
            style={{ width: `${largePct}%` }}
            title={`Large: ${distribution.large}`}
          />
        )}
      </div>
      <div className="text-muted-foreground mt-1 flex justify-between text-xs">
        <span className="flex items-center gap-1">
          <span className="bg-primary/40 inline-block h-2 w-2 rounded-sm" />
          Small ×{distribution.small}
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-primary/70 inline-block h-2 w-2 rounded-sm" />
          Med ×{distribution.medium}
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-primary inline-block h-2 w-2 rounded-sm" />
          Large ×{distribution.large}
        </span>
      </div>
    </div>
  );
};
