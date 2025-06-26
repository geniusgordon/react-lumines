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
        return 'text-green-400';
      case 'paused':
        return 'text-yellow-400';
      case 'countdown':
        return 'text-blue-400';
      case 'gameOver':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="rounded-md bg-gray-800/50 p-3">
      <div className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
        Game Stats
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-3 text-sm">
        <div>
          <div className="text-gray-500">Status</div>
          <div className={`font-semibold ${getStatusColor(status)}`}>
            {status}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Score</div>
          <div className="font-mono font-semibold text-blue-400">
            {score.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Seed</div>
          <div className="flex items-center gap-2">
            <div
              className="font-mono font-semibold text-orange-400"
              title={seed}
            >
              {seed.length > 16 ? `${seed.substring(0, 16)}...` : seed}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(seed)}
              className="text-gray-400 transition-colors hover:text-white"
              title="Copy seed to clipboard"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        {scale && (
          <div>
            <div className="text-gray-500">Scale</div>
            <div className="font-mono font-semibold text-purple-400">
              {(scale * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
