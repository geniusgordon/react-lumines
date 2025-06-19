interface QuickStatsProps {
  status: string;
  score: number;
}

export function QuickStats({ status, score }: QuickStatsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'playing':
        return 'text-green-400';
      case 'paused':
        return 'text-yellow-400';
      case 'gameOver':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-md bg-gray-800/50 p-3">
        <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          Status
        </div>
        <div className={`text-lg font-semibold ${getStatusColor(status)}`}>
          {status}
        </div>
      </div>
      <div className="rounded-md bg-gray-800/50 p-3">
        <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          Score
        </div>
        <div className="text-lg font-semibold text-blue-400">
          {score.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
