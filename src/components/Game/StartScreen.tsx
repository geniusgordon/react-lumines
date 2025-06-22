import { Play, ChartNoAxesColumn } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_CONTROLS } from '@/constants/gameConfig';

import { KeyboardShortcuts } from '../DebugPanel';

export const StartScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate('/play');
  };

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-5xl font-bold tracking-tight text-white">
            Lumines
          </h1>
          <p className="text-sm text-gray-400">
            Match colors, clear with rhythm
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleStartGame}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-500 hover:to-blue-600 hover:shadow-xl focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
          >
            <Play className="h-5 w-5 transition-transform" />
            <span className="text-lg">Start Game</span>
          </button>

          <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 font-medium text-gray-200 shadow-lg transition-all duration-200 hover:from-gray-600 hover:to-gray-700 hover:shadow-xl focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none">
            <ChartNoAxesColumn className="h-5 w-5 transition-transform" />
            <span className="text-lg">Rankings</span>
          </button>
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded-lg bg-gray-800/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-300">
              How to Play
            </h3>
            <div className="space-y-1 text-xs text-gray-400">
              <p>• Drop 2×2 blocks to form same-colored rectangles</p>
              <p>• Timeline sweeps across to clear marked patterns</p>
              <p>• Chain clears for higher scores</p>
            </div>
          </div>

          <KeyboardShortcuts controlsConfig={DEFAULT_CONTROLS} />
        </div>
      </div>
    </div>
  );
};
