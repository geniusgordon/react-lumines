import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TrainingHUD } from '@/components/TrainingHUD';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import { useGame } from '@/hooks/useGame';
import { useGameControls } from '@/hooks/useGameControls';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import { readAndClearBranchState } from '@/utils/branchState';

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
    enabled: gameState.status === 'playing' || gameState.status === 'countdown',
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

  // Auto-start; skip countdown only when auto-sweep is off (manual practice mode).
  useEffect(() => {
    if (gameState.status === 'initial') {
      actions.startNewGame();
    }
    if (gameState.status === 'countdown' && !gameState.practice?.autoSweep) {
      actions.skipCountdown();
    }
  }, [gameState.status, gameState.practice?.autoSweep, actions]);

  // Restore branched state if navigated here from a replay
  useEffect(() => {
    const branch = readAndClearBranchState();
    if (branch && branch.mode === 'training') {
      _dispatch({
        type: 'RESTORE_STATE',
        payload: {
          ...branch.gameState,
          mode: 'training',
          status: 'playing',
          undoStack: [],
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!scale.ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-game-background relative flex h-screen w-full flex-col items-center justify-center">
      <ScreenHeader title="Training" onBack={() => navigate('/')} />

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
        <TrainingHUD gameState={gameState} dispatch={_dispatch} />
      </div>
    </div>
  );
}
