import { useReducer } from 'react';

import { GameBoard, DebugPanel } from './components';
import { useGameLoop } from './hooks';
import {
  gameReducerWithDebug,
  createInitialGameState,
} from './reducers/gameReducer';

function App() {
  // Initialize game state with debug-aware reducer
  const [gameState, dispatch] = useReducer(
    gameReducerWithDebug,
    createInitialGameState(undefined, false)
  );

  // Initialize game loop with debug mode option
  const { isRunning, currentFPS, frameCount, manualStep, isDebugMode } =
    useGameLoop(gameState, dispatch, { debugMode: gameState.debugMode });

  // Start the game when component mounts
  const handleStartGame = () => {
    dispatch({ type: 'START_GAME', frame: 0 });
  };

  const handlePauseResume = () => {
    if (gameState.status === 'playing') {
      dispatch({ type: 'PAUSE', frame: frameCount });
    } else if (gameState.status === 'paused') {
      dispatch({ type: 'RESUME', frame: frameCount });
    }
  };

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center">
      <div className="text-game-text mb-4 text-2xl font-bold">
        🎮 Lumines Game - useGameLoop Demo
      </div>

      {/* Debug Panel */}
      <DebugPanel
        gameState={gameState}
        dispatch={dispatch}
        frameCount={frameCount}
        currentFPS={currentFPS}
        isRunning={isRunning}
        isDebugMode={isDebugMode}
        manualStep={manualStep}
      />

      {/* Game Controls */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {gameState.status === 'start' && (
          <button
            onClick={handleStartGame}
            className="bg-game-light hover:bg-game-light/80 text-ui rounded px-4 py-2"
          >
            Start Game
          </button>
        )}
        {(gameState.status === 'playing' || gameState.status === 'paused') && (
          <button
            onClick={handlePauseResume}
            className="bg-game-light hover:bg-game-light/80 text-ui rounded px-4 py-2"
          >
            {gameState.status === 'playing' ? 'Pause' : 'Resume'}
          </button>
        )}
      </div>

      {/* Game Board */}
      <div>
        <GameBoard
          board={gameState.board}
          currentBlock={gameState.currentBlock}
          blockPosition={gameState.blockPosition}
          timeline={gameState.timeline}
          queue={gameState.queue}
        />
      </div>
    </div>
  );
}

export default App;
