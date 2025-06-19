import type { GameState, GameAction } from '@/types/game';

export interface DebugPanelProps {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  frameCount: number;
  currentFPS: number;
  isRunning: boolean;
  isDebugMode: boolean;
  manualStep: () => void;
}

export function DebugPanel({
  gameState,
  dispatch,
  frameCount,
  currentFPS,
  isRunning,
  isDebugMode,
  manualStep,
}: DebugPanelProps) {
  const handleToggleDebugMode = () => {
    dispatch({
      type: 'SET_DEBUG_MODE',
      frame: frameCount,
      payload: !gameState.debugMode,
    });
  };

  return (
    <>
      {/* Debug Mode Banner */}
      {gameState.debugMode && (
        <div className="mb-4 max-w-md rounded border border-orange-600 bg-orange-900/50 p-3 text-center">
          <div className="text-sm text-orange-200">
            🐛 <strong>Debug Mode Active</strong>
            <br />
            Game loop paused. Use "Step Frame" to advance manually.
            <br />
            <span className="text-xs">
              Check browser console for detailed logging.
            </span>
          </div>
        </div>
      )}

      {/* Debug Status Display */}
      <div className="text-game-text mb-4 text-center">
        <div>Status: {gameState.status}</div>
        <div>Frame: {frameCount}</div>
        <div>FPS: {currentFPS}</div>
        <div>Loop Running: {isRunning ? 'Yes' : 'No'}</div>
        <div>Debug Mode: {isDebugMode ? 'Manual Stepping' : 'Auto'}</div>
        <div>Debug Logging: {gameState.debugMode ? 'Enabled' : 'Disabled'}</div>
        <div>Score: {gameState.score}</div>
      </div>

      {/* Debug Controls */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={handleToggleDebugMode}
          className={`text-ui rounded px-4 py-2 transition-colors ${
            gameState.debugMode
              ? 'bg-game-dark hover:bg-game-dark/80'
              : 'bg-gray-600 hover:bg-gray-500'
          }`}
          title={
            gameState.debugMode
              ? 'Disable debug logging and manual stepping'
              : 'Enable debug logging and manual stepping'
          }
        >
          🐛 {gameState.debugMode ? 'Exit Debug' : 'Debug Mode'}
        </button>

        {gameState.debugMode && gameState.status === 'playing' && (
          <button
            onClick={manualStep}
            className="rounded bg-orange-600 px-4 py-2 font-mono text-white hover:bg-orange-500"
            title="Advance exactly one game frame (16.67ms of game time)"
          >
            ⏭️ Step Frame (+1)
          </button>
        )}

        {gameState.debugMode && (
          <button
            onClick={() => console.clear()}
            className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-500"
            title="Clear the browser console"
          >
            🧹 Clear Console
          </button>
        )}
      </div>
    </>
  );
}
