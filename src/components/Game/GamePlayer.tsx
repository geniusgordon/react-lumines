import { useEffect, useMemo } from 'react';

import { useControls, useGamePlayer } from '@/hooks';

import { GameCore } from './GameCore';

interface GamePlayerProps {
  scale: number;
  showDebugPanel?: boolean;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({
  scale,
  showDebugPanel = false,
}) => {
  const seed = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('seed') ?? Date.now().toString();
  }, []);

  // Use live gameplay hook
  const { gameState, gameLoop, actions } = useGamePlayer(seed, showDebugPanel);

  // Setup controls for user input
  const controls = useControls(gameState, actions, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  useEffect(() => {
    if (gameState.status === 'initial') {
      actions.startNewGame();
    }
  }, [gameState.status, actions]);

  return (
    <GameCore
      gameState={gameState}
      actions={actions}
      controls={controls}
      gameLoop={gameLoop}
      showDebugPanel={showDebugPanel}
      scale={scale}
    />
  );
};
