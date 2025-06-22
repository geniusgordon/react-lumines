import { useReducer } from 'react';

import { GameScreen, PauseMenu, GameOverMenu } from '@/components/Game';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import { useControls, useGameLoop } from '@/hooks';
import {
  gameReducerWithDebug,
  createInitialGameState,
} from '@/reducers/gameReducer';

import { DebugPanel } from '../DebugPanel';

export const Game: React.FC = () => {
  const [gameState, dispatch] = useReducer(
    gameReducerWithDebug,
    createInitialGameState(undefined, false)
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
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center">
      <DebugPanel
        gameState={gameState}
        dispatch={dispatch}
        frameCount={frameCount}
        currentFPS={currentFPS}
        isRunning={isRunning}
        isDebugMode={isDebugMode}
        manualStep={manualStep}
        controls={controls}
      />

      <GameScreen gameState={gameState} />

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
