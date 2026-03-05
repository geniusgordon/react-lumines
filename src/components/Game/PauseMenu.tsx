import { Play, RotateCcw, Home, Pause } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { UseGameActions } from '@/hooks';
import type { GameState, ControlsConfig } from '@/types/game';
import { formatKey } from '@/utils/keyboard';

interface PauseMenuProps {
  gameState: GameState;
  actions: UseGameActions;
  controlsConfig: ControlsConfig;
  replayMode?: boolean;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  gameState,
  actions,
  controlsConfig,
  replayMode = false,
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
    navigate(replayMode ? '/leaderboard' : '/');
  };

  return (
    <Dialog
      open={true}
      onOpenChange={open => {
        if (!open) {
          actions.resume();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.stopPropagation()}
        className="bg-popover border-border text-foreground mx-4 max-w-md min-w-[320px] backdrop-blur-md"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-muted/20 rounded-full p-3">
              <Pause className="text-muted-foreground h-8 w-8" />
            </div>
          </div>
          <h2 className="from-foreground to-muted-foreground mb-2 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent">
            Paused
          </h2>
        </div>

        <div className="space-y-3">
          <Button onClick={handleResume} size="lg" className="w-full">
            <Play />
            Resume Game
          </Button>

          <Button
            onClick={handleRestart}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <RotateCcw />
            Restart Game
          </Button>

          <Button
            onClick={handleQuit}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            <Home />
            {replayMode ? 'Go Back' : 'Quit to Menu'}
          </Button>
        </div>

        <div className="border-border mt-8 border-t pt-6">
          <div className="text-muted-foreground text-center text-sm">
            <p className="mb-2">Quick Resume:</p>
            <div className="flex items-center justify-center gap-2">
              {controlsConfig.pause.map((key, index) => (
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
