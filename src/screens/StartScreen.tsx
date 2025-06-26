import { Play, ChartNoAxesColumn } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import { KeyboardShortcuts } from '@/components/DebugPanel';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';

export const StartScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate('/play');
  };

  const handleRankings = () => {
    navigate('/leaderboard');
  };

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/95 p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-5xl font-bold tracking-tight text-white">
            Lumines
          </h1>
          <p className="text-sm text-gray-400">
            Match colors, clear with rhythm
          </p>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            onClick={handleStartGame}
            variant="primary"
            icon={Play}
            fullWidth
          >
            Start Game
          </Button>

          <Button
            size="lg"
            onClick={handleRankings}
            variant="secondary"
            icon={ChartNoAxesColumn}
            fullWidth
          >
            Rankings
          </Button>
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-gray-700/30 bg-gray-800/50 p-4 backdrop-blur-sm">
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-300">
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
