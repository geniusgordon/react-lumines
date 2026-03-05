import { ChevronDown, ClipboardList, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <span>Advanced</span>
        <ChevronDown
          className={`h-3 w-3 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
        />
      </button>

      {showAdvanced && (
        <div className="mt-3 space-y-3">
          <div className="rounded-md bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Debug Mode:</span>
                <span
                  className={
                    gameState.debugMode ? 'text-primary' : 'text-muted-foreground'
                  }
                >
                  {gameState.debugMode ? 'Manual' : 'Auto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Logging:</span>
                <span
                  className={
                    gameState.debugMode ? 'text-success' : 'text-muted-foreground'
                  }
                >
                  {gameState.debugMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Debug Tools Section */}
          <div className="space-y-2">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Debug Tools
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleLogState}
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                title="Log detailed game state analysis to console"
              >
                <ClipboardList className="size-3" />
                Log State
              </Button>

              <Button
                onClick={handleCopyData}
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                title="Copy comprehensive debug data to clipboard"
              >
                <Copy className="size-3" />
                Copy Data
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleLogReplay}
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                title="Log replay data to console"
              >
                <ClipboardList className="size-3" />
                Log Replay
              </Button>

              <Button
                onClick={handleCopyReplay}
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                title="Copy replay data to clipboard"
              >
                <Copy className="size-3" />
                Copy Replay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
