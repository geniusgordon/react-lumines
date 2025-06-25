import { useEffect } from 'react';

import { useControls, useReplayPlayer } from '@/hooks';
import type { ReplayData } from '@/types/replay';

import { GameCore } from './GameCore';

interface ReplayPlayerProps {
  scale: number;
  replayData: ReplayData;
  showDebugPanel?: boolean;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  scale,
  replayData,
  showDebugPanel = false,
}) => {
  // Use replay processing hook
  const { gameState, processReplay, isProcessing } = useReplayPlayer(
    replayData.seed
  );

  // Setup controls (disabled for replay mode)
  const controls = useControls(gameState, () => {}, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  // Process replay when component mounts or replay data changes
  useEffect(() => {
    if (replayData && !isProcessing) {
      processReplay(replayData);
    }
  }, [replayData, processReplay, isProcessing]);

  return (
    <GameCore
      gameState={gameState}
      dispatch={() => {}} // No user input in replay mode
      controls={controls}
      gameLoop={null} // No game loop for replay
      showDebugPanel={showDebugPanel}
      scale={scale}
    />
  );
};
