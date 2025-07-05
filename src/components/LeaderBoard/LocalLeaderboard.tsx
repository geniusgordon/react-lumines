import { Link } from 'react-router-dom';

import type { SavedReplay } from '@/types/replay';

import { EmptyState } from './EmptyState';
import { LeaderboardEntry } from './LeaderboardEntry';

interface LocalLeaderboardProps {
  replays: SavedReplay[];
  onEmptyAction: () => void;
}

export const LocalLeaderboard: React.FC<LocalLeaderboardProps> = ({
  replays,
  onEmptyAction,
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (replays.length === 0) {
    return (
      <EmptyState
        message="No replays found"
        actionText="Start Playing"
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="space-y-2">
      {replays.map((replay, index) => (
        <Link key={replay.id} to={`/replays/${replay.id}`} className="block">
          <LeaderboardEntry
            rank={index + 1}
            name={replay.name}
            playerName={replay.data.metadata?.playerName || 'Anonymous'}
            score={replay.data.metadata?.finalScore || 0}
            date={formatDate(replay.savedAt)}
            isClickable
          />
        </Link>
      ))}
    </div>
  );
};
