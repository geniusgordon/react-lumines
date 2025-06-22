import { useReducer } from 'react';

import { DEFAULT_CONTROLS } from '@/constants/gameConfig';

import {
  GameScreen,
  DebugPanel,
  KeyboardShortcuts,
  PauseMenu,
  GameOverMenu,
} from './components';
import { useControls, useGameLoop } from './hooks';
import {
  gameReducerWithDebug,
  createInitialGameState,
} from './reducers/gameReducer';

function App() {
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

      <div className="fixed bottom-4 left-4 z-40">
        <KeyboardShortcuts controlsConfig={DEFAULT_CONTROLS} />
      </div>

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
}

export default App;
