interface PerformanceMetricsProps {
  frameCount: number;
  currentFPS: number;
  isRunning: boolean;
}

export function PerformanceMetrics({
  frameCount,
  currentFPS,
  isRunning,
}: PerformanceMetricsProps) {
  const getFPSColor = (fps: number) => {
    if (fps >= 55) {
      return 'text-green-400';
    }
    if (fps >= 30) {
      return 'text-yellow-400';
    }
    return 'text-red-400';
  };

  return (
    <div className="rounded-md bg-gray-800/50 p-3">
      <div className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
        Performance
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Frame</div>
          <div className="font-mono text-gray-200">{frameCount}</div>
        </div>
        <div>
          <div className="text-gray-500">FPS</div>
          <div className={`font-mono font-semibold ${getFPSColor(currentFPS)}`}>
            {currentFPS}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Loop</div>
          <div
            className={`font-semibold ${isRunning ? 'text-green-400' : 'text-red-400'}`}
          >
            {isRunning ? '●' : '○'}
          </div>
        </div>
      </div>
    </div>
  );
}
