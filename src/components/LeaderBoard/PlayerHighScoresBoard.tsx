import { Button } from '@/components/ui/button';
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
        <p className="text-muted-foreground">Loading player high scores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-destructive mb-4">
          Failed to load player high scores
        </p>
        <p className="text-muted-foreground mb-4 text-sm">{error}</p>
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
          className="border-border bg-card block w-full rounded-lg border p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-secondary text-secondary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold tabular-nums">
                #{index + 1}
              </div>
              <div>
                <h3 className="text-foreground font-semibold">
                  {entry.player_name}
                </h3>
                <p className="text-muted-foreground text-left text-xs">
                  Best score
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-foreground font-bold tabular-nums">
                {entry.max_score.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
