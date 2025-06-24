import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Game } from '@/components/Game/Game';
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

  const formatDuration = (ms: number | undefined) => {
    if (!ms) {
      return 'N/A';
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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
      <div className="absolute top-0 right-0 left-0 border-b border-gray-700 bg-gray-900 p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-400">
              {replay.name}
            </h1>
            <div className="mt-1 text-sm text-gray-400">
              <span>{replay.data.metadata?.playerName || 'Anonymous'}</span>
              <span className="mx-2">•</span>
              <span>{formatDate(replay.savedAt)}</span>
              {replay.data.metadata?.finalScore && (
                <>
                  <span className="mx-2">•</span>
                  <span className="font-semibold text-yellow-400">
                    Score: {replay.data.metadata.finalScore.toLocaleString()}
                  </span>
                </>
              )}
              {replay.data.metadata?.duration && (
                <>
                  <span className="mx-2">•</span>
                  <span>
                    Duration: {formatDuration(replay.data.metadata.duration)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="rounded bg-blue-600 px-3 py-2 text-sm transition-colors hover:bg-blue-700"
            >
              Export
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded bg-red-600 px-3 py-2 text-sm transition-colors hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="rounded bg-gray-700 px-3 py-2 text-sm transition-colors hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="flex h-full w-full items-center justify-center">
        <Game replayMode={true} replayData={replay.data} />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
            <h2 className="mb-4 text-xl font-bold">Delete Replay</h2>
            <p className="mb-6 text-gray-300">
              Are you sure you want to delete "{replay.name}"? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded bg-gray-700 px-4 py-2 transition-colors hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
