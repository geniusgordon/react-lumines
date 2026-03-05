import { Bug } from 'lucide-react';

interface DebugModeBannerProps {
  isVisible: boolean;
}

export function DebugModeBanner({ isVisible }: DebugModeBannerProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-3 rounded-lg border border-primary/50 bg-gradient-to-r from-primary/20 to-destructive/20 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-foreground">
        <Bug className="h-5 w-5" />
        <div>
          <div className="font-semibold text-foreground">Debug Mode Active</div>
          <div className="text-sm text-foreground/90">
            Game loop paused. Use controls below to step through frames.
          </div>
        </div>
      </div>
    </div>
  );
}
