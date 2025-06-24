import { useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

import { useSaveLoadReplay } from '@/hooks/useSaveLoadReplay';

export function LeaderboardScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { savedReplays } = useSaveLoadReplay();

  const filter = searchParams.get('filter') || 'all';

  const filteredReplays = useMemo(() => {
    let replays = [...savedReplays];

    // Apply filters
    switch (filter) {
      case 'score':
        replays = replays.filter(
          r => r.data.metadata?.finalScore !== undefined
        );
        replays.sort(
          (a, b) =>
            (b.data.metadata?.finalScore || 0) -
            (a.data.metadata?.finalScore || 0)
        );
        break;
      case 'duration':
        replays = replays.filter(r => r.data.metadata?.duration !== undefined);
        replays.sort(
          (a, b) =>
            (b.data.metadata?.duration || 0) - (a.data.metadata?.duration || 0)
        );
        break;
      case 'recent':
        replays.sort((a, b) => b.savedAt - a.savedAt);
        break;
      default:
        // 'all' - sort by score if available, then by date
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

  const formatDuration = (ms: number | undefined) => {
    if (!ms) {
      return 'N/A';
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-purple-400">Leaderboard</h1>
          <button
            onClick={() => navigate('/')}
            className="rounded bg-gray-800 px-4 py-2 transition-colors hover:bg-gray-700"
          >
            Back to Menu
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-4">
          {[
            { key: 'all', label: 'All' },
            { key: 'score', label: 'High Score' },
            { key: 'duration', label: 'Duration' },
            { key: 'recent', label: 'Recent' },
          ].map(({ key, label }) => (
            <Link
              key={key}
              to={`/leaderboard${key === 'all' ? '' : `?filter=${key}`}`}
              className={`rounded px-4 py-2 transition-colors ${
                filter === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Replay List */}
        {filteredReplays.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-lg text-gray-400">No replays found</p>
            <button
              onClick={() => navigate('/play')}
              className="rounded bg-purple-600 px-6 py-3 transition-colors hover:bg-purple-700"
            >
              Play Game
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReplays.map((replay, index) => (
              <Link
                key={replay.id}
                to={`/replays/${replay.id}`}
                className="block rounded-lg border border-gray-700 bg-gray-900 p-4 transition-colors hover:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-2xl font-bold text-purple-400">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{replay.name}</h3>
                      <p className="text-sm text-gray-400">
                        {replay.data.metadata?.playerName || 'Anonymous'} •{' '}
                        {formatDate(replay.savedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {replay.data.metadata?.finalScore && (
                      <div className="text-xl font-bold text-yellow-400">
                        {replay.data.metadata.finalScore.toLocaleString()}
                      </div>
                    )}
                    {replay.data.metadata?.duration && (
                      <div className="text-sm text-gray-400">
                        {formatDuration(replay.data.metadata.duration)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
