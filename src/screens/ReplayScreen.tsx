import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Game } from '@/components/Game/Game';
import { ReplayHeader } from '@/components/ReplayHeader';
import { useSaveLoadReplay } from '@/hooks/useSaveLoadReplay';
import type { SavedReplay } from '@/types/replay';

export function ReplayScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedReplays, deleteReplay, exportReplayToFile } =
    useSaveLoadReplay();

  const [replay, setReplay] = useState<SavedReplay | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/leaderboard');
      return;
    }

    const foundReplay = savedReplays.find(r => r.id === id);
    if (!foundReplay) {
      navigate('/leaderboard');
      return;
    }

    setReplay(foundReplay);
  }, [id, savedReplays, navigate]);

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

  if (!replay) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="mb-4 text-lg text-gray-400">Loading replay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-game-background h-screen text-white">
      <ReplayHeader
        replay={replay}
        onExport={handleExport}
        onDelete={() => setShowDeleteConfirm(true)}
        onBack={() => navigate('/leaderboard')}
      />

      {/* Game Container */}
      <div className="flex h-full w-full items-center justify-center">
        <Game replayMode={true} replayData={replay.data} />
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Replay"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-purple-400">{replay.name}</span>
            ? This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
