import { ChevronDown, ClipboardList, Copy, ArrowDown } from 'lucide-react';
import { useState } from 'react';

import type { GameState, GameAction } from '@/types/game';
import { logGameState } from '@/utils/debugLogger';

interface AdvancedSectionProps {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  frameCount: number;
  currentFPS: number;
  isRunning: boolean;
}

export function AdvancedSection({
  gameState,
  dispatch,
  frameCount,
  currentFPS,
  isRunning,
}: AdvancedSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleLogState = () => {
    logGameState(gameState);
  };

  const handleCopyData = () => {
    const timestamp = new Date().toISOString();
    const data = {
      meta: {
        timestamp,
        version: '1.0',
        capturedBy: 'DebugPanel',
      },
      performance: {
        fps: currentFPS,
        isRunning,
        frameCount,
      },
      gameState,
    };

    navigator.clipboard
      ?.writeText(JSON.stringify(data, null, 2))
      .then(() => {
        console.log('📋 Debug data copied to clipboard');
      })
      .catch(err => {
        console.error('❌ Failed to copy debug data:', err);
      });
  };

  const handleApplyGravity = () => {
    dispatch({
      type: 'APPLY_GRAVITY',
      frame: frameCount,
    });
  };

  const isGamePlaying = gameState.status === 'playing';

  return (
    <div className="border-t border-gray-700/50 pt-4">
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between text-xs font-medium tracking-wide text-gray-400 uppercase transition-colors hover:text-gray-300"
      >
        <span>Advanced</span>
        <ChevronDown
          className={`h-3 w-3 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
        />
      </button>

      {showAdvanced && (
        <div className="mt-3 space-y-3">
          <div className="rounded-md bg-gray-800/30 p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Debug Mode:</span>
                <span
                  className={
                    gameState.debugMode ? 'text-orange-400' : 'text-gray-400'
                  }
                >
                  {gameState.debugMode ? 'Manual' : 'Auto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Logging:</span>
                <span
                  className={
                    gameState.debugMode ? 'text-green-400' : 'text-gray-400'
                  }
                >
                  {gameState.debugMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Game Actions Section */}
          <div className="space-y-2">
            <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
              Game Actions
            </div>

            <button
              onClick={handleApplyGravity}
              disabled={!isGamePlaying}
              className={`w-full rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                isGamePlaying
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500'
                  : 'cursor-not-allowed bg-gray-700 text-gray-500'
              }`}
              title={
                isGamePlaying
                  ? 'Apply gravity to make all blocks fall down'
                  : 'Game must be playing to apply gravity'
              }
            >
              <div className="flex items-center justify-center gap-2">
                <ArrowDown className="h-3 w-3" />
                Apply Gravity
              </div>
            </button>
          </div>

          {/* Debug Tools Section */}
          <div className="space-y-2">
            <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
              Debug Tools
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLogState}
                className="flex-1 rounded-md bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                title="Log detailed game state analysis to console"
              >
                <div className="flex items-center justify-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Log State
                </div>
              </button>

              <button
                onClick={handleCopyData}
                className="flex-1 rounded-md bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                title="Copy comprehensive debug data to clipboard"
              >
                <div className="flex items-center justify-center gap-1">
                  <Copy className="h-3 w-3" />
                  Copy Data
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
