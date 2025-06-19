import { Bug } from 'lucide-react';

interface DebugModeBannerProps {
  isVisible: boolean;
}

export function DebugModeBanner({ isVisible }: DebugModeBannerProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-3 rounded-lg border border-orange-500/50 bg-gradient-to-r from-orange-900/80 to-red-900/80 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-orange-100">
        <Bug className="h-5 w-5" />
        <div>
          <div className="font-semibold text-orange-200">Debug Mode Active</div>
          <div className="text-sm text-orange-300/90">
            Game loop paused. Use controls below to step through frames.
          </div>
        </div>
      </div>
    </div>
  );
}
