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
  const { gameState, pauseReplay, resumeReplay, startNewGame, restartReplay } =
    useReplayPlayer(replayData);

  // Setup controls (disabled for replay mode)
  const emptyActions = {
    moveLeft: () => {},
    moveRight: () => {},
    rotateCW: () => {},
    rotateCCW: () => {},
    softDrop: () => {},
    hardDrop: () => {},
    pause: pauseReplay,
    resume: resumeReplay,
    tick: () => {},
    startNewGame: startNewGame,
    restartGame: restartReplay,
    setDebugMode: () => {},
  };
  const controls = useControls(gameState, emptyActions, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  return (
    <GameCore
      gameState={gameState}
      actions={emptyActions} // No user input in replay mode
      controls={controls}
      gameLoop={null} // No game loop for replay
      showDebugPanel={showDebugPanel}
      scale={scale}
    />
  );
};
