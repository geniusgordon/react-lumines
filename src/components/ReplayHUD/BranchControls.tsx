import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { GameState } from '@/types/game';
import { writeBranchState } from '@/utils/branchState';

interface BranchControlsProps {
  gameState: GameState;
  sourceReplayId: string;
  currentFrame: number;
}

export const BranchControls: React.FC<BranchControlsProps> = ({
  gameState,
  sourceReplayId,
  currentFrame,
}) => {
  const navigate = useNavigate();

  const handleTakeOver = () => {
    writeBranchState({
      gameState,
      sourceReplayId,
      sourceFrame: currentFrame,
      mode: 'play',
    });
    navigate('/play');
  };

  const handleOpenInTraining = () => {
    writeBranchState({
      gameState,
      sourceReplayId,
      sourceFrame: currentFrame,
      mode: 'training',
    });
    navigate('/training');
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Branch
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="w-full text-xs"
        onClick={handleTakeOver}
      >
        Take Over
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs"
        onClick={handleOpenInTraining}
      >
        Open in Training
      </Button>
    </div>
  );
};
