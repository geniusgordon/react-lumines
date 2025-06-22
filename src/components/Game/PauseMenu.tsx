import { Play, RotateCcw, Home, Pause } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import type { GameState, GameAction, ControlsConfig } from '@/types/game';
import { formatKey } from '@/utils/keyboard';

interface PauseMenuProps {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  controlsConfig: ControlsConfig;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  gameState,
  dispatch,
  controlsConfig,
}) => {
  const navigate = useNavigate();
  const { status } = gameState;

  if (status !== 'paused' && status !== 'countdownPaused') {
    return null;
  }

  const handleResume = () => {
    dispatch({ type: 'RESUME', frame: gameState.frame });
  };

  const handleRestart = () => {
    dispatch({ type: 'RESTART', frame: gameState.frame });
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
          <button
            onClick={handleResume}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:from-green-500 hover:to-emerald-500 focus:ring-2 focus:ring-green-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
            title="Resume the current game"
          >
            <Play className="h-4 w-4" />
            <span className="text-lg">Resume Game</span>
          </button>

          <button
            onClick={handleRestart}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-gray-600 to-gray-700 px-4 py-3 font-medium text-gray-100 shadow-lg transition-all hover:from-gray-500 hover:to-gray-600 focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
            title="Start a new game from the beginning"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-lg">Restart Game</span>
          </button>

          <button
            onClick={handleQuit}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 font-medium text-red-100 shadow-lg transition-all hover:from-red-500 hover:to-red-600 focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
            title="Return to the main menu"
          >
            <Home className="h-4 w-4" />
            <span className="text-lg">Quit to Menu</span>
          </button>
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
