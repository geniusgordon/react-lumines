import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Game } from '@/components/Game/Game';
import { ReplayHeader } from '@/components/ReplayHeader';
import { useOnlineReplay } from '@/hooks/useOnlineReplay';
import { useSaveLoadReplay } from '@/hooks/useSaveLoadReplay';
import type { ExpandedReplayData, SavedReplay } from '@/types/replay';

import { expandReplayDataWithSnapshots } from '../utils/replayUtils';

export function ReplayScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedReplays, deleteReplay, exportReplayToFile } =
    useSaveLoadReplay();

  const [replay, setReplay] = useState<SavedReplay | null>(null);
  const [replayData, setReplayData] = useState<ExpandedReplayData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isOnlineReplay, setIsOnlineReplay] = useState(false);

  // Only fetch online replay if ID is not found in local replays
  const shouldFetchOnline = id && !savedReplays.find(r => r.id === id);
  const {
    replayData: onlineReplayData,
    loading: onlineLoading,
    error: onlineError,
  } = useOnlineReplay(shouldFetchOnline ? id : null);

  useEffect(() => {
    if (!id) {
      navigate('/leaderboard');
      return;
    }

    // First try to find local replay
    const foundReplay = savedReplays.find(r => r.id === id);
    if (foundReplay) {
      setReplay(foundReplay);
      setIsOnlineReplay(false);
      const replayData = expandReplayDataWithSnapshots(foundReplay.data);
      setReplayData(replayData);
    } else if (onlineReplayData) {
      // Handle online replay data
      setReplay(null);
      setIsOnlineReplay(true);
      const replayData = expandReplayDataWithSnapshots(onlineReplayData);
      setReplayData(replayData);
    } else if (onlineError) {
      // Navigate back if online replay not found
      navigate('/leaderboard');
    }
  }, [id, savedReplays, onlineReplayData, onlineError, navigate]);

  const handleDelete = () => {
    if (!replay) {
      return;
    }

    const result = deleteReplay(replay.id);
    if (result.success) {
      navigate('/leaderboard');
    } else {
      console.error('Failed to delete replay:', result.error?.message);
    }
  };

  const handleExport = () => {
    if (!replay) {
      return;
    }

    const result = exportReplayToFile(replay.id);
    if (!result.success) {
      console.error('Failed to export replay:', result.error?.message);
    }
  };

  if (onlineLoading || (!replay && !onlineReplayData) || !replayData) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">
          {onlineLoading ? 'Loading online replay...' : 'Loading...'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-game-background h-screen text-white">
      <ReplayHeader
        replay={replay}
        onlineReplayData={isOnlineReplay ? onlineReplayData : undefined}
        onExport={isOnlineReplay ? undefined : handleExport}
        onDelete={isOnlineReplay ? undefined : () => setShowDeleteConfirm(true)}
        onBack={() => navigate('/leaderboard')}
      />

      {/* Game Container */}
      <div className="flex h-full w-full items-center justify-center pt-[96px]">
        <Game replayMode={true} replayData={replayData} />
      </div>

      {!isOnlineReplay && (
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Replay"
          message={
            <>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-purple-400">
                {replay?.data.metadata?.playerName || 'Anonymous'}'s Game -{' '}
                {replay?.data.metadata?.finalScore?.toLocaleString() || 'N/A'}
              </span>
              ? This action cannot be undone.
            </>
          }
        />
      )}
    </div>
  );
}
