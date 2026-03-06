import { Bug } from 'lucide-react';

interface DebugModeBannerProps {
  isVisible: boolean;
}

export function DebugModeBanner({ isVisible }: DebugModeBannerProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="border-warning/30 bg-warning/10 mb-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm">
      <div className="text-foreground flex items-center gap-2">
        <Bug className="text-warning h-5 w-5" />
        <div>
          <div className="text-foreground font-semibold">Debug Mode Active</div>
          <div className="text-foreground/90 text-sm">
            Game loop paused. Use controls below to step through frames.
          </div>
        </div>
      </div>
    </div>
  );
}
