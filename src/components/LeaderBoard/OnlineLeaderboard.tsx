import { Button } from '@/components/Button';
import type { TopLeaderboardEntry } from '@/types/database';

import { EmptyState } from './EmptyState';
import { LeaderboardEntry } from './LeaderboardEntry';

interface OnlineLeaderboardProps {
  leaderboard: TopLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onEmptyAction: () => void;
}

export const OnlineLeaderboard: React.FC<OnlineLeaderboardProps> = ({
  leaderboard,
  loading,
  error,
  onRetry,
  onEmptyAction,
}) => {
  const formatDate = (timestamp: string | null) => {
    if (!timestamp) {
      return '-';
    }

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400">Loading online leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-red-400">Failed to load online leaderboard</p>
        <p className="mb-4 text-sm text-gray-400">{error}</p>
        <div className="flex justify-center">
          <Button onClick={onRetry} variant="secondary" className="w-auto">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <EmptyState
        message="No online scores yet"
        actionText="Be the first to play!"
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => {
        if (!entry.replay_id) {
          return null;
        }
        return (
          <LeaderboardEntry
            key={entry.id}
            replayId={entry.replay_id}
            rank={index + 1}
            playerName={entry.player_name || 'Anonymous'}
            score={entry.score || 0}
            date={formatDate(entry.achieved_at)}
          />
        );
      })}
    </div>
  );
};
