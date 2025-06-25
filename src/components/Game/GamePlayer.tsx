import { useEffect, useMemo } from 'react';

import { useControls, useGamePlayer } from '@/hooks';

import { GameCore } from './GameCore';

interface GamePlayerProps {
  scale: number;
  initialSeed?: string;
  showDebugPanel?: boolean;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({
  scale,
  initialSeed,
  showDebugPanel = false,
}) => {
  // Get seed from URL params if not provided
  const seed = useMemo(() => {
    if (initialSeed) {
      return initialSeed;
    }
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('seed') ?? Date.now().toString();
  }, [initialSeed]);

  // Use live gameplay hook
  const { gameState, gameLoop, dispatch } = useGamePlayer(seed, showDebugPanel);

  // Setup controls for user input
  const controls = useControls(gameState, dispatch, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  useEffect(() => {
    if (gameState.status === 'initial') {
      dispatch({ type: 'START_GAME' });
    }
  }, [gameState.status, dispatch]);

  return (
    <GameCore
      gameState={gameState}
      dispatch={dispatch}
      controls={controls}
      gameLoop={gameLoop}
      showDebugPanel={showDebugPanel}
      scale={scale}
    />
  );
};
