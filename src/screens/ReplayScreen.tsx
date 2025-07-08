import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Game } from '@/components/Game/Game';
import { ReplayHeader } from '@/components/ReplayHeader';
import { useReplayData } from '@/hooks/useReplayData';
import { useSaveLoadReplay } from '@/hooks/useSaveLoadReplay';

export function ReplayScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteReplay, exportReplayToFile } = useSaveLoadReplay();
  const { replay, replayData, isOnlineReplay, loading, error } =
    useReplayData(id);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    const result = exportReplayToFile(replay);
    if (!result.success) {
      console.error('Failed to export replay:', result.error?.message);
    }
  };

  if (loading || !replayData) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">
          {loading ? 'Loading replay...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-game-background h-screen text-white">
      <ReplayHeader
        isOnlineReplay={isOnlineReplay}
        savedAt={replay?.savedAt || new Date().getTime()}
        replayData={replayData}
        onExport={handleExport}
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
