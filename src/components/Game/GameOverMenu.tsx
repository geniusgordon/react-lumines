import { RotateCcw, Home, Trophy } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { UI_Z_INDEX, getZIndexClass } from '@/constants/zIndex';
import type { UseGameActions } from '@/hooks';
import type { GameState, ControlsConfig } from '@/types/game';
import { formatKey } from '@/utils/keyboard';

interface GameOverMenuProps {
  gameState: GameState;
  actions: UseGameActions;
  controlsConfig: ControlsConfig;
  replayMode?: boolean;
}

export const GameOverMenu: React.FC<GameOverMenuProps> = ({
  gameState,
  actions,
  controlsConfig,
  replayMode = false,
}) => {
  const navigate = useNavigate();
  const { status, score } = gameState;

  if (status !== 'gameOver') {
    return null;
  }

  const handlePlayAgain = () => {
    actions.restartGame();
  };

  const handleQuit = () => {
    navigate(replayMode ? '/leaderboard' : '/');
  };

  return (
    <div
      className={`fixed inset-0 ${getZIndexClass(UI_Z_INDEX.MODALS)} flex items-center justify-center`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <div className="mx-4 max-w-md min-w-[320px] rounded-2xl border border-gray-600/50 bg-gray-900/95 p-8 shadow-xl backdrop-blur-md">
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
  );
};
