import { ChevronDown, ClipboardList, Copy } from 'lucide-react';
import { useState } from 'react';

import type { GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { logGameState } from '@/utils/debugLogger';

interface AdvancedSectionProps {
  gameState: GameState;
  frameCount: number;
  currentFPS: number;
  isRunning: boolean;
  exportReplay: () => ReplayData | null;
}

export function AdvancedSection({
  gameState,
  frameCount,
  currentFPS,
  isRunning,
  exportReplay,
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

  const handleLogReplay = () => {
    const replayData = exportReplay();
    if (replayData) {
      console.log('🎬 Replay data:', replayData);
    } else {
      console.log('🎬 No replay data available');
    }
  };

  const handleCopyReplay = () => {
    const replayData = exportReplay();
    if (replayData) {
      navigator.clipboard
        ?.writeText(JSON.stringify(replayData, null, 2))
        .then(() => {
          console.log('🎬 Replay data copied to clipboard');
        })
        .catch(err => {
          console.error('❌ Failed to copy replay data:', err);
        });
    }
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

            <div className="flex gap-2">
              <button
                onClick={handleLogReplay}
                className="flex-1 rounded-md bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                title="Log replay data to console"
              >
                <div className="flex items-center justify-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Log Replay
                </div>
              </button>

              <button
                onClick={handleCopyReplay}
                className="flex-1 rounded-md bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                title="Copy replay data to clipboard"
              >
                <div className="flex items-center justify-center gap-1">
                  <Copy className="h-3 w-3" />
                  Copy Replay
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
