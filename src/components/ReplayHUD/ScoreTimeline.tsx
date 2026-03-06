import React from 'react';

import type { ScorePoint, KeyMoment } from '@/types/replay';

interface ScoreTimelineProps {
  scoreTimeline: ScorePoint[];
  keyMoments: KeyMoment[];
  currentFrame: number;
  totalFrames: number;
}

export const ScoreTimeline: React.FC<ScoreTimelineProps> = ({
  scoreTimeline,
  keyMoments,
  currentFrame,
  totalFrames,
}) => {
  const width = 144;
  const height = 60;
  const padding = { top: 4, right: 4, bottom: 4, left: 4 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (scoreTimeline.length < 2) {
    return (
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Score
        </p>
        <div className="bg-muted/30 flex h-[60px] w-full items-center justify-center rounded">
          <span className="text-muted-foreground text-xs">No data</span>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...scoreTimeline.map(p => p.score), 1);
  const maxFrame = totalFrames > 0 ? totalFrames : scoreTimeline[scoreTimeline.length - 1].frame || 1;

  const toX = (frame: number) => padding.left + (frame / maxFrame) * innerW;
  const toY = (score: number) => padding.top + innerH - (score / maxScore) * innerH;

  const points = scoreTimeline.map(p => `${toX(p.frame)},${toY(p.score)}`).join(' ');
  const playheadX = toX(currentFrame);

  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
        Score
      </p>
      <svg
        width={width}
        height={height}
        className="overflow-visible rounded"
        style={{ background: 'rgba(0,0,0,0.15)' }}
      >
        {/* Polyline */}
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Key moment circles */}
        {keyMoments.map((m, i) => (
          <circle
            key={i}
            cx={toX(m.frame)}
            cy={toY(scoreTimeline.find(p => p.frame >= m.frame)?.score ?? 0)}
            r={3}
            fill="hsl(var(--warning))"
            opacity={0.9}
          />
        ))}

        {/* Playhead */}
        <line
          x1={playheadX}
          y1={padding.top}
          x2={playheadX}
          y2={height - padding.bottom}
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
          opacity={0.6}
        />
      </svg>
    </div>
  );
};
