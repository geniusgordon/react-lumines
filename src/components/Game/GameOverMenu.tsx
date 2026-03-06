import { RotateCcw, Home, Trophy, Upload, Check, Share } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  const { isSharing, shareMessage, shareReplay } = useReplayShare(replayData);

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
    navigate('/leaderboard?view=online');
  };

  return (
    <Dialog open={true}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        className="bg-popover border-border text-foreground mx-4 max-w-md min-w-[min(448px,calc(100%-2rem))] backdrop-blur-md"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-destructive/20 rounded-full p-3">
              <Trophy className="text-destructive h-8 w-8" />
            </div>
          </div>
          <h2 className="from-destructive to-destructive/70 mb-2 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent">
            Game Over
          </h2>
          <div className="space-y-1">
            <p className="text-muted-foreground text-lg">Final Score</p>
            <p className="from-foreground to-muted-foreground bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent tabular-nums">
              {score.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={handlePlayAgain} size="lg" className="w-full">
            <RotateCcw />
            Play Again
          </Button>

          {/* Score submission section - only in game mode */}
          {!replayMode && (
            <>
              {!hasSubmitted && (
                <div className="space-y-3">
                  <div>
                    <label className="text-muted-foreground mb-2 block text-sm font-medium">
                      Your Name (optional)
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      placeholder="Anonymous"
                      className="border-input bg-input text-foreground placeholder-muted-foreground focus:border-ring w-full rounded-lg border px-3 py-2 focus:outline-none"
                      maxLength={50}
                    />
                  </div>
                  <Button
                    onClick={handleSubmitScore}
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    <Upload />
                    {isSubmitting
                      ? 'Submitting...'
                      : 'Submit to Online Leaderboard'}
                  </Button>
                </div>
              )}

              {hasSubmitted && (
                <div className="space-y-3">
                  <div className="text-success flex items-center justify-center gap-2">
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
                      className="w-full"
                      disabled={isSharing}
                    >
                      <Share />
                      {isSharing ? 'Sharing...' : 'Share Replay'}
                    </Button>
                    <Button
                      onClick={handleViewLeaderboard}
                      variant="secondary"
                      size="lg"
                      className="w-full"
                    >
                      <Trophy />
                      View Online Leaderboard
                    </Button>
                  </div>
                </div>
              )}

              {submissionError && (
                <div className="text-destructive text-center text-sm">
                  {submissionError}
                </div>
              )}

              {shareMessage && (
                <div className="text-success text-center text-sm">
                  {shareMessage}
                </div>
              )}
            </>
          )}

          <Button
            onClick={handleQuit}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <Home />
            {replayMode ? 'Go Back' : 'Quit to Menu'}
          </Button>
        </div>

        <div className="border-border mt-8 border-t pt-6">
          <div className="text-muted-foreground text-center text-sm">
            <p className="mb-2">Quick Restart:</p>
            <div className="flex items-center justify-center gap-2">
              {controlsConfig.restart.map((key, index) => (
                <kbd
                  key={index}
                  className="border-border bg-muted text-muted-foreground inline-flex items-center rounded-lg border px-3 py-1.5 font-mono text-xs shadow-inner"
                >
                  {formatKey(key)}
                </kbd>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
