import { useCallback } from 'react';

import { ReplayController } from '@/components/ReplayController';
import { useControls, useReplayPlayer } from '@/hooks';
import { useReplayKeyboardControls } from '@/hooks/useReplayKeyboardControls';
import type { UseResponsiveScaleReturn } from '@/hooks/useResponsiveScale';
import type { ReplayData } from '@/types/replay';

import { GameCore } from './GameCore';

interface ReplayPlayerProps {
  scale: UseResponsiveScaleReturn;
  replayData: ReplayData;
  showDebugPanel?: boolean;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  scale,
  replayData,
}) => {
  // Use replay processing hook with controller functionality
  const {
    gameState,
    gameLoop,
    actions,
    currentFrame,
    totalFrames,
    speed,
    isPlaying,
    controllerActions,
  } = useReplayPlayer(replayData);

  // Setup controls (disabled for replay mode)
  const controls = useControls(gameState, actions, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  const exportReplay = useCallback(() => {
    return replayData;
  }, [replayData]);

  // Enable keyboard controls for replay
  useReplayKeyboardControls({
    controllerActions,
    currentSpeed: speed,
    enabled: true,
  });

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <div>
        <GameCore
          gameState={gameState}
          actions={actions} // Actions include no-ops for game actions and replay controls
          controls={controls}
          gameLoop={gameLoop} // No game loop for replay
          scale={scale}
          replayMode={true}
          exportReplay={exportReplay}
        />
      </div>
      <div style={{ width: scale.scaledWidth }}>
        <ReplayController
          isPlaying={isPlaying}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          speed={speed}
          onPlayPause={controllerActions.togglePlayPause}
          onRestart={controllerActions.restart}
          onSeek={controllerActions.seek}
          onSpeedChange={controllerActions.setSpeed}
          onStepFrames={controllerActions.stepFrames}
        />
      </div>
    </div>
  );
};
