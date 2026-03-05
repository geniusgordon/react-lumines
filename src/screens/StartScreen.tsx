import { Play, ChartNoAxesColumn, GraduationCap } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { KeyboardShortcuts } from '@/components/DebugPanel';
import { Button } from '@/components/ui/button';
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
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center overflow-hidden p-4">
      <div className="scrollbar border-border bg-card w-full max-w-md overflow-auto rounded-2xl border p-8">
        <div className="mb-8 text-center">
          <h1 className="text-foreground mb-2 text-5xl font-bold tracking-tight">
            Lumines
          </h1>
          <p className="text-muted-foreground text-sm">
            Match colors, clear with rhythm
          </p>
        </div>

        <div className="space-y-3">
          <Button size="lg" onClick={handleStartGame} className="w-full">
            <Play />
            Start Game
          </Button>

          <Button
            size="lg"
            onClick={handleRankings}
            variant="secondary"
            className="w-full"
          >
            <ChartNoAxesColumn />
            Rankings
          </Button>

          <Button
            size="lg"
            onClick={() => navigate('/training')}
            variant="secondary"
            className="w-full"
          >
            <GraduationCap />
            Training
          </Button>
        </div>

        <div className="mt-8 space-y-4">
          <div className="border-border bg-muted rounded-lg border p-4 backdrop-blur-sm">
            <h3 className="text-foreground mb-3 text-sm font-semibold tracking-wide">
              How to Play
            </h3>
            <div className="text-muted-foreground space-y-1 text-xs">
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
