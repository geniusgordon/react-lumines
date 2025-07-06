import { Upload, Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { UI_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import { useScoreSubmission } from '@/hooks/useScoreSubmission';
import type { ReplayData } from '@/types/replay';

export interface ReplayHeaderProps {
  isOnlineReplay: boolean;
  replayData: ReplayData | null;
  savedAt: number;
  enableUpload?: boolean;
  onExport?: () => void;
  onDelete?: () => void;
  onBack: () => void;
}

export function ReplayHeader({
  isOnlineReplay,
  replayData,
  savedAt,
  enableUpload = true,
  onExport,
  onDelete,
  onBack,
}: ReplayHeaderProps) {
  const [playerName, setPlayerName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const { isSubmitting, hasSubmitted, submissionError, submitScore } =
    useScoreSubmission();

  const formatDate = (timestamp: number | string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleUpload = async () => {
    if (!replayData) {
      return;
    }
    await submitScore(replayData, playerName.trim() || 'Anonymous');
  };

  const canUpload =
    enableUpload && !isOnlineReplay && replayData && !hasSubmitted;

  return (
    <div
      className="absolute top-0 right-0 left-0 border-b border-gray-700 bg-gray-900 p-4"
      style={{ ...getZIndexStyle(UI_Z_INDEX.SYSTEM_OVERLAY) }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-400">
            {replayData?.metadata?.playerName || 'Anonymous'}'s Game
            {isOnlineReplay && (
              <span className="ml-2 text-sm text-blue-400">(Online)</span>
            )}
          </h1>
          <div className="mt-1 text-sm text-gray-400">
            <span>{formatDate(savedAt)}</span>
            {replayData?.metadata?.finalScore && (
              <>
                <span className="mx-2">•</span>
                <span className="font-semibold text-yellow-400">
                  Score: {replayData.metadata.finalScore.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {onExport && (
            <Button onClick={onExport} variant="primary" size="sm">
              Export
            </Button>
          )}
          {canUpload && (
            <Button
              onClick={() => setShowUploadForm(!showUploadForm)}
              variant="secondary"
              size="sm"
              icon={Upload}
            >
              {showUploadForm ? 'Cancel' : 'Upload'}
            </Button>
          )}
          {onDelete && (
            <Button onClick={onDelete} variant="warning" size="sm">
              Delete
            </Button>
          )}
          <Button onClick={onBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="mx-auto mt-4 max-w-4xl border-t border-gray-700 py-4">
          {!hasSubmitted && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  maxLength={50}
                />
              </div>
              <Button
                onClick={handleUpload}
                variant="secondary"
                size="sm"
                icon={Upload}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : 'Submit to Online Leaderboard'}
              </Button>
            </div>
          )}

          {hasSubmitted && (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Check className="h-5 w-5" />
              <span className="text-sm">Score submitted successfully!</span>
            </div>
          )}

          {submissionError && (
            <div className="text-center text-sm text-red-400">
              {submissionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
