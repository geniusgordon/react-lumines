import { Button } from '@/components/Button/Button';
import { UI_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import type { ReplayData } from '@/types/replay';

export interface ReplayHeaderProps {
  isOnlineReplay: boolean;
  replayData: ReplayData | null;
  savedAt: number;
  onExport?: () => void;
  onDelete?: () => void;
  onBack: () => void;
}

export function ReplayHeader({
  isOnlineReplay,
  replayData,
  savedAt,
  onExport,
  onDelete,
  onBack,
}: ReplayHeaderProps) {
  const formatDate = (timestamp: number | string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div
      className="absolute top-0 right-0 left-0 border-b border-gray-700 bg-gray-900 p-4"
      style={{ ...getZIndexStyle(UI_Z_INDEX.SYSTEM_OVERLAY) }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-400">
            {replayData?.metadata?.playerName || 'Anonymous'}'s Game
            {isOnlineReplay && (
              <span className="ml-2 text-sm text-blue-400">(Online)</span>
            )}
          </h1>
          <div className="mt-1 text-sm text-gray-400">
            <span>{formatDate(savedAt)}</span>
            {replayData?.metadata?.finalScore && (
              <>
                <span className="mx-2">•</span>
                <span className="font-semibold text-yellow-400">
                  Score: {replayData.metadata.finalScore.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {onExport && (
            <Button onClick={onExport} variant="primary" size="sm">
              Export
            </Button>
          )}
          {onDelete && (
            <Button onClick={onDelete} variant="warning" size="sm">
              Delete
            </Button>
          )}
          <Button onClick={onBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
