import { useReducer, useMemo } from 'react';

import {
  GameLayout,
  PauseMenu,
  GameOverMenu,
  Countdown,
} from '@/components/Game';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import { useControls, useGameLoop } from '@/hooks';
import {
  gameReducerWithDebug,
  createInitialGameState,
} from '@/reducers/gameReducer';

import { DebugPanel } from '../DebugPanel';

interface GameProps {
  scale: number;
}

export const Game: React.FC<GameProps> = ({ scale }) => {
  const showDebugPanel = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true';
  }, []);

  const [gameState, dispatch] = useReducer(
    gameReducerWithDebug,
    createInitialGameState(undefined, showDebugPanel)
  );

  const controls = useControls(gameState, dispatch, {
    recording: true,
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
    uiUpdateBatchSize: 10,
  });

  const { isRunning, currentFPS, frameCount, manualStep, isDebugMode } =
    useGameLoop(gameState, dispatch, { debugMode: gameState.debugMode });

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

      <div className="flex w-full flex-1 items-center justify-center">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center top',
          }}
        >
          <GameLayout gameState={gameState} />
        </div>
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
