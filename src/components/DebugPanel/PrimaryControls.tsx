import { Bug, Play, SkipForward } from 'lucide-react';
import { useState } from 'react';

interface PrimaryControlsProps {
  debugMode: boolean;
  gameStatus: string;
  onToggleDebugMode: () => void;
  onManualStep: (steps?: number) => void;
}

export function PrimaryControls({
  debugMode,
  gameStatus,
  onToggleDebugMode,
  onManualStep,
}: PrimaryControlsProps) {
  const [stepCount, setStepCount] = useState(1);

  const handleStepCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
    setStepCount(value);
  };

  const presetSteps = [1, 5, 10, 30, 60];

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
        Controls
      </div>

      <div className="flex gap-2">
        <button
          onClick={onToggleDebugMode}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium transition-all ${
            debugMode
              ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg hover:from-orange-500 hover:to-red-500'
              : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-100 hover:from-gray-500 hover:to-gray-600'
          }`}
          title={
            debugMode
              ? 'Disable debug mode and resume normal gameplay'
              : 'Enable debug mode for frame-by-frame analysis'
          }
        >
          {debugMode ? (
            <Play className="h-4 w-4" />
          ) : (
            <Bug className="h-4 w-4" />
          )}
          {debugMode ? 'Exit Debug' : 'Debug Mode'}
        </button>
      </div>

      {debugMode && gameStatus === 'playing' && (
        <div className="space-y-2">
          <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">
            Frame Stepping
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="999"
              value={stepCount}
              onChange={handleStepCountChange}
              className="w-16 rounded border border-gray-600 bg-gray-800 px-2 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              title="Number of frames to advance"
            />
            <button
              onClick={() => onManualStep(stepCount)}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 font-medium text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500"
              title={`Advance ${stepCount} frame${stepCount === 1 ? '' : 's'} (${(stepCount * 16.67).toFixed(1)}ms)`}
            >
              <SkipForward className="h-4 w-4" />
              Step {stepCount}
            </button>
          </div>

          <div className="flex gap-1">
            {presetSteps.map(preset => (
              <button
                key={preset}
                onClick={() => setStepCount(preset)}
                className={`rounded px-2 py-1 text-xs transition-all ${
                  stepCount === preset
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={`Set to ${preset} frame${preset === 1 ? '' : 's'}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
