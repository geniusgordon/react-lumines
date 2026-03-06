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
    <div className="bg-muted/50 rounded-md p-3">
      <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Performance
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Frame</div>
          <div className="text-foreground font-mono tabular-nums [font-feature-settings:'tnum']">
            {frameCount}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">FPS</div>
          <div
            className={`font-mono font-semibold tabular-nums [font-feature-settings:'tnum'] ${getFPSColor(currentFPS)}`}
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
