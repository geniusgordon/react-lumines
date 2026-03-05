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
      return 'text-success';
    }
    if (fps >= 30) {
      return 'text-warning';
    }
    return 'text-destructive';
  };

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Performance
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Frame</div>
          <div className="font-mono text-foreground tabular-nums">
            {frameCount}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">FPS</div>
          <div
            className={`font-mono font-semibold tabular-nums ${getFPSColor(currentFPS)}`}
          >
            {currentFPS}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Loop</div>
          <div
            className={`font-semibold ${isRunning ? 'text-success' : 'text-destructive'}`}
          >
            {isRunning ? '●' : '○'}
          </div>
        </div>
      </div>
    </div>
  );
}
