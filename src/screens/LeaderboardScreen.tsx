import { ArrowLeft, Trophy, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

import { Button } from '@/components/Button';
import { useSaveLoadReplay } from '@/hooks/useSaveLoadReplay';

export function LeaderboardScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { savedReplays } = useSaveLoadReplay();

  const filter = searchParams.get('filter') || 'score';

  const filteredReplays = useMemo(() => {
    const replays = [...savedReplays];

    // Apply filters
    switch (filter) {
      case 'recent':
        replays.sort((a, b) => b.savedAt - a.savedAt);
        break;
      default:
        // 'score' - sort by score, then by date
        replays.sort((a, b) => {
          const scoreA = a.data.metadata?.finalScore || 0;
          const scoreB = b.data.metadata?.finalScore || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          return b.savedAt - a.savedAt;
        });
    }

    return replays;
  }, [savedReplays, filter]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-700/50 bg-gray-900/95 p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">
            Leaderboard
          </h1>
          <p className="text-sm text-gray-400">
            {filteredReplays.length}{' '}
            {filteredReplays.length === 1 ? 'replay' : 'replays'}
          </p>
        </div>

        <div className="mb-6 flex w-full gap-2">
          <Button
            onClick={() => navigate('/leaderboard')}
            variant={
              !searchParams.get('filter') ||
              searchParams.get('filter') === 'score'
                ? 'primary'
                : 'secondary'
            }
            icon={Trophy}
            fullWidth
          >
            High Score
          </Button>
          <Button
            onClick={() => navigate('/leaderboard?filter=recent')}
            variant={
              searchParams.get('filter') === 'recent' ? 'primary' : 'secondary'
            }
            icon={Clock}
            fullWidth
          >
            Recent
          </Button>
        </div>

        <div className="scrollbar mb-6 max-h-96 overflow-y-auto">
          {filteredReplays.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-gray-400">No replays found</p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate('/play')}
                  variant="primary"
                  className="w-auto"
                >
                  Start Playing
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReplays.map((replay, index) => (
                <Link
                  key={replay.id}
                  to={`/replays/${replay.id}`}
                  className="block rounded-lg border border-gray-700/30 bg-gray-800/50 p-4 transition-all duration-200 hover:border-gray-600/50 hover:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-gray-300">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {replay.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {replay.data.metadata?.playerName || 'Anonymous'} •{' '}
                          {formatDate(replay.savedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">
                        {replay.data.metadata?.finalScore?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={() => navigate('/')}
          variant="secondary"
          icon={ArrowLeft}
          fullWidth
        >
          Back to Menu
        </Button>
      </div>
    </div>
  );
}
