import { RotateCcw, Home, Trophy, Upload, Check, Share } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { Portal } from '@/components/Portal';
import { UI_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import type { UseGameActions } from '@/hooks';
import { useReplayShare } from '@/hooks/useReplayShare';
import { useScoreSubmission } from '@/hooks/useScoreSubmission';
import type { GameState, ControlsConfig } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { formatKey } from '@/utils/keyboard';

interface GameOverMenuProps {
  gameState: GameState;
  actions: UseGameActions;
  controlsConfig: ControlsConfig;
  replayMode?: boolean;
  exportReplay?: () => ReplayData | null;
}

export const GameOverMenu: React.FC<GameOverMenuProps> = ({
  gameState,
  actions,
  controlsConfig,
  replayMode = false,
  exportReplay,
}) => {
  const navigate = useNavigate();
  const { status, score } = gameState;
  const [playerName, setPlayerName] = useState('');
  const { isSubmitting, hasSubmitted, submissionError, submitScore } =
    useScoreSubmission();

  const replayData = !replayMode && exportReplay ? exportReplay() : null;
  const { isSharing, shareMessage, shareReplay } = useReplayShare(
    replayData,
    score
  );

  if (status !== 'gameOver') {
    return null;
  }

  const handlePlayAgain = () => {
    actions.restartGame();
  };

  const handleQuit = () => {
    navigate(replayMode ? '/leaderboard' : '/');
  };

  const handleSubmitScore = async () => {
    if (replayMode || !exportReplay) {
      return;
    }

    const replayData = exportReplay();

    if (!replayData || !replayData.inputs.length) {
      return;
    }

    try {
      await submitScore(replayData, playerName.trim() || 'Anonymous');
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  const handleViewLeaderboard = () => {
    navigate('/leaderboard?tab=online');
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ ...getZIndexStyle(UI_Z_INDEX.MODALS) }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

        <div className="mx-4 max-w-md min-w-md rounded-2xl border border-gray-600/50 bg-gray-900/95 p-8 shadow-xl backdrop-blur-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-500/20 p-3">
                <Trophy className="h-8 w-8 text-red-400" />
              </div>
            </div>
            <h2 className="mb-2 bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-3xl font-bold text-transparent">
              Game Over
            </h2>
            <div className="space-y-1">
              <p className="text-lg text-slate-300">Final Score</p>
              <p className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-4xl font-bold text-transparent">
                {score.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handlePlayAgain}
              variant="primary"
              size="lg"
              icon={RotateCcw}
              fullWidth
            >
              Play Again
            </Button>

            {/* Score submission section - only in game mode */}
            {!replayMode && (
              <>
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
                      onClick={handleSubmitScore}
                      variant="secondary"
                      size="lg"
                      icon={Upload}
                      fullWidth
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? 'Submitting...'
                        : 'Submit to Online Leaderboard'}
                    </Button>
                  </div>
                )}

                {hasSubmitted && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <Check className="h-5 w-5" />
                      <span className="text-sm">
                        Score submitted successfully!
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={shareReplay}
                        variant="secondary"
                        size="lg"
                        icon={Share}
                        fullWidth
                        disabled={isSharing}
                      >
                        {isSharing ? 'Sharing...' : 'Share Replay'}
                      </Button>
                      <Button
                        onClick={handleViewLeaderboard}
                        variant="secondary"
                        size="lg"
                        icon={Trophy}
                        fullWidth
                      >
                        View Online Leaderboard
                      </Button>
                    </div>
                  </div>
                )}

                {submissionError && (
                  <div className="text-center text-sm text-red-400">
                    {submissionError}
                  </div>
                )}

                {shareMessage && (
                  <div className="text-center text-sm text-green-400">
                    {shareMessage}
                  </div>
                )}
              </>
            )}

            <Button
              onClick={handleQuit}
              variant="secondary"
              size="lg"
              icon={Home}
              fullWidth
            >
              {replayMode ? 'Go Back' : 'Quit to Menu'}
            </Button>
          </div>

          <div className="mt-8 border-t border-slate-600/30 pt-6">
            <div className="text-center text-sm text-slate-400">
              <p className="mb-2">Quick Restart:</p>
              <div className="flex items-center justify-center gap-2">
                {controlsConfig.restart.map((key, index) => (
                  <kbd
                    key={index}
                    className="inline-flex items-center rounded-lg border border-slate-600/40 bg-slate-800/60 px-3 py-1.5 font-mono text-xs text-slate-300 shadow-inner"
                  >
                    {formatKey(key)}
                  </kbd>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};
