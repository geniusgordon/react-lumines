import { Copy } from 'lucide-react';

interface QuickStatsProps {
  status: string;
  score: number;
  seed: string;
  scale?: number;
}

export function QuickStats(props: QuickStatsProps) {
  const { score, seed, scale } = props;
  const status = props.status === 'countdownPaused' ? 'paused' : props.status;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'playing':
        return 'text-success';
      case 'paused':
        return 'text-warning';
      case 'countdown':
        return 'text-primary';
      case 'gameOver':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Game Stats
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Status</div>
          <div className={`font-semibold ${getStatusColor(status)}`}>
            {status}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Score</div>
          <div className="font-mono font-semibold text-primary tabular-nums">
            {score.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Seed</div>
          <div className="flex items-center gap-2">
            <div
              className="font-mono font-semibold text-primary tabular-nums"
              title={seed}
            >
              {seed.length > 16 ? `${seed.substring(0, 16)}...` : seed}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(seed)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              title="Copy seed to clipboard"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        {scale && (
          <div>
            <div className="text-muted-foreground">Scale</div>
            <div className="font-mono font-semibold text-primary tabular-nums">
              {(scale * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
