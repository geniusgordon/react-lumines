import { useReducer, useState, useEffect } from 'react';

import { GameBoard } from './components';
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

      {gameState.debugMode && (
        <div className="mb-4 max-w-md rounded border border-orange-600 bg-orange-900/50 p-3 text-center">
          <div className="text-sm text-orange-200">
            🐛 <strong>Debug Mode Active</strong>
            <br />
            Game loop paused. Use "Step Frame" to advance manually.
          </div>
        </div>
      )}

      {/* Game Status Display */}
      <div className="text-game-text mb-4 text-center">
        <div>Status: {gameState.status}</div>
        <div>Frame: {frameCount}</div>
        <div>FPS: {currentFPS}</div>
        <div>Loop Running: {isRunning ? 'Yes' : 'No'}</div>
        <div>Debug Mode: {isDebugMode ? 'Manual Stepping' : 'Auto'}</div>
        <div>Debug Logging: {gameState.debugMode ? 'Enabled' : 'Disabled'}</div>
        <div>Score: {gameState.score}</div>
      </div>

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

      {/* Debug Controls */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={() =>
            dispatch({
              type: 'SET_DEBUG_MODE',
              frame: frameCount,
              payload: !gameState.debugMode,
            })
          }
          className={`text-ui rounded px-4 py-2 transition-colors ${
            gameState.debugMode
              ? 'bg-game-dark hover:bg-game-dark/80'
              : 'bg-gray-600 hover:bg-gray-500'
          }`}
        >
          🐛 {gameState.debugMode ? 'Exit Debug' : 'Debug Mode'}
        </button>

        {gameState.debugMode && gameState.status === 'playing' && (
          <button
            onClick={manualStep}
            className="rounded bg-orange-600 px-4 py-2 font-mono text-white hover:bg-orange-500"
          >
            ⏭️ Step Frame (+1)
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
