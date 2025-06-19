import { useState } from 'react';

import type { GameState, GameAction } from '@/types/game';

import { AdvancedSection } from './AdvancedSection';
import { DebugModeBanner } from './DebugModeBanner';
import { DebugPanelHeader } from './DebugPanelHeader';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { PerformanceMetrics } from './PerformanceMetrics';
import { PrimaryControls } from './PrimaryControls';
import { QuickStats } from './QuickStats';

export interface DebugPanelProps {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  frameCount: number;
  currentFPS: number;
  isRunning: boolean;
  isDebugMode: boolean;
  manualStep: (steps?: number) => void;
}

export function DebugPanel({
  gameState,
  dispatch,
  frameCount,
  currentFPS,
  isRunning,
  manualStep,
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggleDebugMode = () => {
    dispatch({
      type: 'SET_DEBUG_MODE',
      frame: frameCount,
      payload: !gameState.debugMode,
    });
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 select-none">
      <DebugModeBanner isVisible={gameState.debugMode} />

      {/* Main Debug Panel */}
      <div className="rounded-lg border border-gray-600/50 bg-gray-900/95 shadow-xl backdrop-blur-sm">
        <DebugPanelHeader
          isExpanded={isExpanded}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
        />

        {isExpanded && (
          <div className="space-y-4 p-4">
            <QuickStats status={gameState.status} score={gameState.score} />

            <PerformanceMetrics
              frameCount={frameCount}
              currentFPS={currentFPS}
              isRunning={isRunning}
            />

            <PrimaryControls
              debugMode={gameState.debugMode}
              gameStatus={gameState.status}
              onToggleDebugMode={handleToggleDebugMode}
              onManualStep={manualStep}
            />

            <AdvancedSection
              gameState={gameState}
              frameCount={frameCount}
              currentFPS={currentFPS}
              isRunning={isRunning}
            />
          </div>
        )}
      </div>

      <KeyboardShortcuts isVisible={gameState.debugMode && isExpanded} />
    </div>
  );
}
