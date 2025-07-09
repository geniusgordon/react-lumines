import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import {
  TabNavigation,
  ReplayImport,
  LocalLeaderboard,
  OnlineLeaderboard,
  PlayerHighScoresBoard,
} from '@/components/LeaderBoard';
import { useOnlineLeaderboard } from '@/hooks/useOnlineLeaderboard';
import { usePlayerHighScores } from '@/hooks/usePlayerHighScores';
import { useSaveLoadReplay } from '@/hooks/useSaveLoadReplay';

export function LeaderboardScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { savedReplays, importReplayFromFile } = useSaveLoadReplay();
  const { leaderboard, loading, error, refresh } = useOnlineLeaderboard();
  const {
    playerHighScores,
    loading: playerScoresLoading,
    error: playerScoresError,
    refresh: refreshPlayerScores,
  } = usePlayerHighScores();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Map URL params to view states
  const getViewFromParams = () => {
    const view = searchParams.get('view');

    if (view === 'online') {
      return 'online';
    }
    if (view === 'recent') {
      return 'local-recent';
    }
    if (view === 'players') {
      return 'player-scores';
    }

    return 'local-score'; // default
  };

  const currentView = getViewFromParams();

  const filteredReplays = useMemo(() => {
    const replays = [...savedReplays];

    // Apply filters based on current view
    switch (currentView) {
      case 'local-recent':
        replays.sort((a, b) => b.savedAt - a.savedAt);
        break;
      case 'local-score':
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
  }, [savedReplays, currentView]);

  const handleViewChange = (view: string) => {
    switch (view) {
      case 'local-score':
        navigate('/leaderboard');
        break;
      case 'local-recent':
        navigate('/leaderboard?view=recent');
        break;
      case 'online':
        navigate('/leaderboard?view=online');
        break;
      case 'player-scores':
        navigate('/leaderboard?view=players');
        break;
      default:
        navigate('/leaderboard');
    }
  };

  const handleFileImport = async (file: File) => {
    setImportMessage(null);

    try {
      const result = await importReplayFromFile(file);
      if (result.success) {
        setImportMessage('Replay imported successfully!');
        setTimeout(() => setImportMessage(null), 3000);
      } else {
        setImportMessage(`Import failed: ${result.error}`);
        setTimeout(() => setImportMessage(null), 5000);
      }
    } catch {
      setImportMessage('Import failed: An unexpected error occurred');
      setTimeout(() => setImportMessage(null), 5000);
    }
  };

  const handlePlayNavigation = () => {
    navigate('/play');
  };

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-700/50 bg-gray-900/95 p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">
            Leaderboard
          </h1>
          <p className="text-sm text-gray-400">
            {currentView === 'player-scores' ? (
              <>
                {playerScoresLoading
                  ? 'Loading...'
                  : `${playerHighScores.length} ${playerHighScores.length === 1 ? 'player' : 'players'}`}
              </>
            ) : currentView === 'online' ? (
              <>
                {loading
                  ? 'Loading...'
                  : `${leaderboard.length} ${leaderboard.length === 1 ? 'entry' : 'entries'}`}
              </>
            ) : (
              <>
                {filteredReplays.length}{' '}
                {filteredReplays.length === 1 ? 'replay' : 'replays'}
              </>
            )}
          </p>
        </div>

        <TabNavigation
          currentView={currentView}
          onViewChange={handleViewChange}
        />

        <div className="mb-6 flex h-96 flex-col overflow-hidden">
          {currentView !== 'online' && currentView !== 'player-scores' && (
            <ReplayImport
              onFileImport={handleFileImport}
              importMessage={importMessage}
            />
          )}

          <div className="scrollbar overflow-y-auto">
            {currentView === 'player-scores' ? (
              <PlayerHighScoresBoard
                playerHighScores={playerHighScores}
                loading={playerScoresLoading}
                error={playerScoresError}
                onRetry={refreshPlayerScores}
                onEmptyAction={handlePlayNavigation}
              />
            ) : currentView === 'online' ? (
              <OnlineLeaderboard
                leaderboard={leaderboard}
                loading={loading}
                error={error}
                onRetry={refresh}
                onEmptyAction={handlePlayNavigation}
              />
            ) : (
              <LocalLeaderboard
                replays={filteredReplays}
                onEmptyAction={handlePlayNavigation}
              />
            )}
          </div>
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
