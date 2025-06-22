import { useState } from 'react';

import type { UseControlsReturn } from '@/hooks';
import type { GameState, GameAction } from '@/types/game';

import { AdvancedSection } from './AdvancedSection';
import { ControlsInfo } from './ControlsInfo';
import { DebugModeBanner } from './DebugModeBanner';
import { DebugPanelHeader } from './DebugPanelHeader';
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
  controls: UseControlsReturn;
}

export function DebugPanel({
  gameState,
  dispatch,
  frameCount,
  currentFPS,
  isRunning,
  manualStep,
  controls,
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
    <div className="fixed top-4 right-4 z-60 w-80 select-none">
      <DebugModeBanner isVisible={gameState.debugMode} />
      <div className="flex max-h-[calc(100vh-10rem)] flex-col rounded-lg border border-gray-600/50 bg-gray-900/95 shadow-xl backdrop-blur-sm">
        <DebugPanelHeader
          isExpanded={isExpanded}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
        />

        {isExpanded && (
          <div className="debug-panel-scrollbar max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto p-4">
            <QuickStats status={gameState.status} score={gameState.score} />

            <PerformanceMetrics
              frameCount={frameCount}
              currentFPS={currentFPS}
              isRunning={isRunning}
            />

            <ControlsInfo controls={controls} />

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
    </div>
  );
}
