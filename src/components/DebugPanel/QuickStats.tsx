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
    <div className={`grid gap-3 ${scale ? 'grid-cols-4' : 'grid-cols-3'}`}>
      <div className="rounded-md bg-gray-800/50 p-3">
        <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          Status
        </div>
        <div className={`text-sm font-semibold ${getStatusColor(status)}`}>
          {status}
        </div>
      </div>
      <div className="rounded-md bg-gray-800/50 p-3">
        <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          Score
        </div>
        <div className="text-sm font-semibold text-blue-400">
          {score.toLocaleString()}
        </div>
      </div>
      <div className="rounded-md bg-gray-800/50 p-3">
        <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          Seed
        </div>
        <div className="text-sm font-semibold text-orange-400" title={seed}>
          {seed.length > 8 ? `${seed.substring(0, 8)}...` : seed}
        </div>
      </div>
      {scale && (
        <div className="rounded-md bg-gray-800/50 p-3">
          <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
            Scale
          </div>
          <div className="text-sm font-semibold text-purple-400">
            {(scale * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
}
