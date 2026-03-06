import { useCallback, useState } from 'react';

import { ReplayController } from '@/components/ReplayController';
import { ReplayHUD } from '@/components/ReplayHUD';
import { useGameControls, useReplayPlayer } from '@/hooks';
import { useReplayControls } from '@/hooks/useReplayControls';
import type { UseResponsiveScaleReturn } from '@/hooks/useResponsiveScale';
import type { ExpandedReplayData } from '@/types/replay';

import { GameCore } from './GameCore';

interface ReplayPlayerProps {
  scale: UseResponsiveScaleReturn;
  replayData: ExpandedReplayData;
  showDebugPanel?: boolean;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  scale,
  replayData,
}) => {
  const [showHeatmap, setShowHeatmap] = useState(false);

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

  const controls = useGameControls(gameState, actions, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  const exportReplay = useCallback(() => {
    return replayData;
  }, [replayData]);

  useReplayControls({
    controllerActions,
    currentSpeed: speed,
    enabled: true,
  });

  const keyMomentMarkers = replayData.analytics.keyMoments.map(m => ({
    frame: m.frame,
  }));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <div className="flex items-start gap-4">
        <ReplayHUD
          gameState={gameState}
          analytics={replayData.analytics}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          sourceReplayId={replayData.id}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap(v => !v)}
        />
        <div>
          <GameCore
            gameState={gameState}
            actions={actions}
            controls={controls}
            gameLoop={gameLoop}
            scale={scale}
            replayMode={true}
            trainingMode={showHeatmap}
            exportReplay={exportReplay}
          />
        </div>
      </div>
      <div style={{ width: scale.scaledWidth }}>
        <ReplayController
          isPlaying={isPlaying}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          speed={speed}
          markers={keyMomentMarkers}
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
