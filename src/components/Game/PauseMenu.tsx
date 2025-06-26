import { Play, RotateCcw, Home, Pause } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import type { UseGameActions } from '@/hooks';
import type { GameState, ControlsConfig } from '@/types/game';
import { formatKey } from '@/utils/keyboard';

interface PauseMenuProps {
  gameState: GameState;
  actions: UseGameActions;
  controlsConfig: ControlsConfig;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  gameState,
  actions,
  controlsConfig,
}) => {
  const navigate = useNavigate();
  const { status } = gameState;

  if (status !== 'paused' && status !== 'countdownPaused') {
    return null;
  }

  const handleResume = () => {
    actions.resume();
  };

  const handleRestart = () => {
    actions.restartGame();
  };

  const handleQuit = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <div className="mx-4 max-w-md min-w-[320px] rounded-2xl border border-gray-600/50 bg-gray-900/95 p-8 shadow-xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gray-500/20 p-3">
              <Pause className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h2 className="mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-3xl font-bold text-transparent">
            Paused
          </h2>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleResume}
            variant="primary"
            size="lg"
            icon={Play}
            fullWidth
          >
            Resume Game
          </Button>

          <Button
            onClick={handleRestart}
            variant="secondary"
            size="lg"
            icon={RotateCcw}
            fullWidth
          >
            Restart Game
          </Button>

          <Button
            onClick={handleQuit}
            variant="warning"
            size="lg"
            icon={Home}
            fullWidth
          >
            Quit to Menu
          </Button>
        </div>

        <div className="mt-8 border-t border-slate-600/30 pt-6">
          <div className="text-center text-sm text-slate-400">
            <p className="mb-2">Quick Resume:</p>
            <div className="flex items-center justify-center gap-2">
              {controlsConfig.pause.map((key, index) => (
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
