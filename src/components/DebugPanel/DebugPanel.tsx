import { useState } from 'react';

import type { UseControlsReturn, UseGameActions } from '@/hooks';
import type { GameState } from '@/types/game';

import { AdvancedSection } from './AdvancedSection';
import { ControlsInfo } from './ControlsInfo';
import { DebugModeBanner } from './DebugModeBanner';
import { DebugPanelHeader } from './DebugPanelHeader';
import { PerformanceMetrics } from './PerformanceMetrics';
import { PrimaryControls } from './PrimaryControls';
import { QuickStats } from './QuickStats';

export interface DebugPanelProps {
  gameState: GameState;
  actions: UseGameActions;
  frameCount: number;
  currentFPS: number;
  isRunning: boolean;
  isDebugMode: boolean;
  manualStep: (steps?: number) => void;
  controls: UseControlsReturn;
  scale?: number;
}

export function DebugPanel({
  gameState,
  actions,
  frameCount,
  currentFPS,
  isRunning,
  manualStep,
  controls,
  scale,
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggleDebugMode = () => {
    actions.setDebugMode(!gameState.debugMode);
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
            <QuickStats
              status={gameState.status}
              score={gameState.score}
              scale={scale}
            />

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
