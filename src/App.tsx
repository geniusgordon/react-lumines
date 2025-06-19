import { useReducer } from 'react';

import { GameBoard } from './components';
import { useGameLoop } from './hooks';
import { gameReducer, createInitialGameState } from './reducers/gameReducer';

function App() {
  // Initialize game state with reducer
  const [gameState, dispatch] = useReducer(
    gameReducer,
    createInitialGameState()
  );

  // Initialize game loop
  const { isRunning, currentFPS, frameCount } = useGameLoop(
    gameState,
    dispatch
  );

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

      {/* Game Status Display */}
      <div className="text-game-text mb-4 text-center">
        <div>Status: {gameState.status}</div>
        <div>Frame: {frameCount}</div>
        <div>FPS: {currentFPS}</div>
        <div>Loop Running: {isRunning ? 'Yes' : 'No'}</div>
        <div>Score: {gameState.score}</div>
      </div>

      {/* Game Controls */}
      <div className="mb-8 flex gap-2">
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
