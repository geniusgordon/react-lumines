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
  const { gameState, actions } = useReplayPlayer(replayData);

  // Setup controls (disabled for replay mode)
  const controls = useControls(gameState, actions, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  return (
    <GameCore
      gameState={gameState}
      actions={actions} // Actions include no-ops for game actions and replay controls
      controls={controls}
      gameLoop={null} // No game loop for replay
      showDebugPanel={showDebugPanel}
      scale={scale}
      replayMode={true}
    />
  );
};
