import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { TrainingHUD } from '@/components/TrainingHUD';
import { Button } from '@/components/ui/button';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import { useGame } from '@/hooks/useGame';
import { useGameControls } from '@/hooks/useGameControls';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';

export function TrainingScreen() {
  const navigate = useNavigate();
  const { gameState, actions, _dispatch } = useGame(
    undefined,
    false,
    'training'
  );
  const scale = useResponsiveScale({ minScale: 0.5, maxScale: 2, padding: 40 });

  // Game loop: runs TICK for RAF rendering (training mode TICK only updates fallingColumns)
  const gameLoop = useGameLoop(actions.tick, {
    enabled: gameState.status === 'playing',
  });

  // Training controls: remove A/D (reserved for undo/sweep)
  const trainingControls = {
    ...DEFAULT_CONTROLS,
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
  };

  // Standard controls (move, rotate, hard drop) with training key overrides
  const controls = useGameControls(gameState, actions, {
    controlsConfig: trainingControls,
    enableKeyRepeat: false,
  });

  // Training-specific controls: A = undo, S = sweep
  const handleTrainingKey = useCallback(
    (e: KeyboardEvent) => {
      if (gameState.status !== 'playing') {
        return;
      }
      // A key → UNDO
      if (e.code === 'KeyA' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        _dispatch({ type: 'UNDO' });
      }
      // S key → MANUAL_SWEEP
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        _dispatch({ type: 'MANUAL_SWEEP' });
      }
    },
    [gameState.status, _dispatch]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleTrainingKey);
    return () => window.removeEventListener('keydown', handleTrainingKey);
  }, [handleTrainingKey]);

  // Auto-start and skip countdown
  useEffect(() => {
    if (gameState.status === 'initial') {
      actions.startNewGame();
    }
    if (gameState.status === 'countdown') {
      actions.skipCountdown();
    }
  }, [gameState.status, actions]);

  if (!scale.ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-game-background relative flex h-screen w-full flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 right-0 left-0 flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft />
          Menu
        </Button>
        <span className="text-foreground text-sm font-semibold">Training</span>
        <span className="text-muted-foreground text-sm">
          Score: {gameState.score}
        </span>
      </div>

      {/* Game area + HUD side by side */}
      <div className="flex items-center gap-6">
        <GameCore
          key={gameState.seed}
          gameState={gameState}
          actions={actions}
          controls={controls}
          gameLoop={gameLoop}
          scale={scale}
          replayMode={true}
          trainingMode={true}
          exportReplay={() => null}
        />
        <TrainingHUD gameState={gameState} />
      </div>
    </div>
  );
}
