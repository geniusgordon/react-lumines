import { Button } from '@/components/Button';
import type { PlayerHighScore } from '@/types/database';

import { EmptyState } from './EmptyState';

interface PlayerHighScoresBoardProps {
  playerHighScores: PlayerHighScore[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onEmptyAction: () => void;
}

export const PlayerHighScoresBoard: React.FC<PlayerHighScoresBoardProps> = ({
  playerHighScores,
  loading,
  error,
  onRetry,
  onEmptyAction,
}) => {
  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400">Loading player high scores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-red-400">Failed to load player high scores</p>
        <p className="mb-4 text-sm text-gray-400">{error}</p>
        <div className="flex justify-center">
          <Button onClick={onRetry} variant="secondary" className="w-auto">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (playerHighScores.length === 0) {
    return (
      <EmptyState
        message="No player scores yet"
        actionText="Be the first to play!"
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="space-y-2">
      {playerHighScores.map((entry, index) => (
        <div
          key={entry.player_name}
          className="block w-full rounded-lg border border-gray-700/30 bg-gray-800/50 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-gray-300">
                #{index + 1}
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {entry.player_name}
                </h3>
                <p className="text-left text-xs text-gray-400">Best score</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-white">
                {entry.max_score.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
