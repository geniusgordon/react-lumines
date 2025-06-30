import { useMemo } from 'react';

import { useControls, useGamePlayer } from '@/hooks';
import type { UseResponsiveScaleReturn } from '@/hooks/useResponsiveScale';

import { GameCore } from './GameCore';

interface GamePlayerProps {
  scale: UseResponsiveScaleReturn;
  showDebugPanel?: boolean;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({
  scale,
  showDebugPanel = false,
}) => {
  const seed = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('seed') || undefined;
  }, []);

  // Use live gameplay hook
  const { gameState, gameLoop, actions, exportReplay } = useGamePlayer(
    seed,
    showDebugPanel
  );

  // Setup controls for user input
  const controls = useControls(gameState, actions, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  return (
    <div className="flex h-full w-full items-center justify-center">
      <GameCore
        key={gameState.seed}
        gameState={gameState}
        actions={actions}
        controls={controls}
        gameLoop={gameLoop}
        scale={scale}
        replayMode={false}
        exportReplay={exportReplay}
      />
    </div>
  );
};
