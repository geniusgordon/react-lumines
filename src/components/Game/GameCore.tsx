import { useMemo } from 'react';

import {
  GameLayout,
  PauseMenu,
  GameOverMenu,
  Countdown,
} from '@/components/Game';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import { useControls, useGameWithReplay } from '@/hooks';
import type { ReplayData } from '@/types/replay';

import { DebugPanel } from '../DebugPanel';

interface GameCoreProps {
  scale: number;
  replayMode?: boolean;
  replayData?: ReplayData;
}

export const GameCore: React.FC<GameCoreProps> = ({
  scale,
  replayMode = false,
  replayData,
}) => {
  const showDebugPanel = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true';
  }, []);

  const seed = useMemo(() => {
    if (replayMode && replayData) {
      return replayData.seed;
    }
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('seed') ?? Date.now().toString();
  }, [replayMode, replayData]);

  const { gameState, gameLoop, dispatch } = useGameWithReplay(
    seed,
    showDebugPanel,
    replayMode,
    replayData
  );

  const { isRunning, currentFPS, frameCount, manualStep, isDebugMode } =
    gameLoop;

  const controls = useControls(gameState, dispatch, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {showDebugPanel && (
        <DebugPanel
          gameState={gameState}
          dispatch={dispatch}
          frameCount={frameCount}
          currentFPS={currentFPS}
          isRunning={isRunning}
          isDebugMode={isDebugMode}
          manualStep={manualStep}
          controls={controls}
          scale={scale}
        />
      )}

      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <GameLayout gameState={gameState} />
      </div>

      <Countdown gameState={gameState} />

      <PauseMenu
        gameState={gameState}
        controlsConfig={DEFAULT_CONTROLS}
        dispatch={dispatch}
      />

      <GameOverMenu
        gameState={gameState}
        controlsConfig={DEFAULT_CONTROLS}
        dispatch={dispatch}
      />
    </div>
  );
};
