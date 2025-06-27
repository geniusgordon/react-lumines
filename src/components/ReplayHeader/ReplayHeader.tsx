import { Button } from '@/components/Button/Button';
import { UI_Z_INDEX, getZIndexClass } from '@/constants/zIndex';
import type { SavedReplay } from '@/types/replay';

export interface ReplayHeaderProps {
  replay: SavedReplay;
  onExport: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function ReplayHeader({
  replay,
  onExport,
  onDelete,
  onBack,
}: ReplayHeaderProps) {
  const formatDuration = (ms: number | undefined) => {
    if (!ms) {
      return 'N/A';
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div
      className={`absolute top-0 right-0 left-0 ${getZIndexClass(UI_Z_INDEX.SYSTEM_OVERLAY)} border-b border-gray-700 bg-gray-900 p-4`}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-400">{replay.name}</h1>
          <div className="mt-1 text-sm text-gray-400">
            <span>{replay.data.metadata?.playerName || 'Anonymous'}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(replay.savedAt)}</span>
            {replay.data.metadata?.finalScore && (
              <>
                <span className="mx-2">•</span>
                <span className="font-semibold text-yellow-400">
                  Score: {replay.data.metadata.finalScore.toLocaleString()}
                </span>
              </>
            )}
            {replay.data.metadata?.duration && (
              <>
                <span className="mx-2">•</span>
                <span>
                  Duration: {formatDuration(replay.data.metadata.duration)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onExport} variant="primary" size="sm">
            Export
          </Button>
          <Button onClick={onDelete} variant="warning" size="sm">
            Delete
          </Button>
          <Button onClick={onBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
