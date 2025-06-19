import { ChevronDown, ClipboardList, Copy } from 'lucide-react';
import { useState } from 'react';

import type { GameState } from '@/types/game';

interface AdvancedSectionProps {
  gameState: GameState;
  frameCount: number;
  currentFPS: number;
  isRunning: boolean;
}

export function AdvancedSection({
  gameState,
  frameCount,
  currentFPS,
  isRunning,
}: AdvancedSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleLogState = () => {
    console.log('Game State:', gameState);
    console.log('Frame Count:', frameCount);
    console.log('Performance:', {
      fps: currentFPS,
      isRunning,
    });
  };

  const handleCopyData = () => {
    const data = {
      gameState,
      frameCount,
      currentFPS,
      isRunning,
      timestamp: Date.now(),
    };
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
  };

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

          <div className="flex gap-2">
            <button
              onClick={handleLogState}
              className="flex-1 rounded-md bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
              title="Log current game state to console"
            >
              <div className="flex items-center justify-center gap-1">
                <ClipboardList className="h-3 w-3" />
                Log State
              </div>
            </button>

            <button
              onClick={handleCopyData}
              className="flex-1 rounded-md bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
              title="Copy debug data to clipboard"
            >
              <div className="flex items-center justify-center gap-1">
                <Copy className="h-3 w-3" />
                Copy Data
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
