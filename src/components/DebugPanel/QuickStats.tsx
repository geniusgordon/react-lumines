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
    <div className="bg-muted/50 rounded-md p-3">
      <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Game Stats
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Status</div>
          <div className={`font-semibold ${getStatusColor(status)}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Score</div>
          <div className="text-primary font-mono font-semibold tabular-nums [font-feature-settings:'tnum']">
            {score.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Seed</div>
          <div className="flex items-center gap-2">
            <div
              className="text-primary font-mono font-semibold tabular-nums [font-feature-settings:'tnum']"
              title={seed}
            >
              {seed.length > 12 ? `${seed.substring(0, 12)}...` : seed}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(seed)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Copy seed to clipboard"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        {scale && (
          <div>
            <div className="text-muted-foreground">Scale</div>
            <div className="text-primary font-mono font-semibold tabular-nums [font-feature-settings:'tnum']">
              {(scale * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
