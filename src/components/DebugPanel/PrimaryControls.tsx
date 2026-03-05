import { Bug, Play, SkipForward, Zap, Shuffle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface PrimaryControlsProps {
  debugMode: boolean;
  gameStatus: string;
  onToggleDebugMode: () => void;
  onManualStep: (steps?: number) => void;
  onRestartGame: (seed?: string) => void;
  onSkipCountdown: () => void;
}

export function PrimaryControls({
  debugMode,
  gameStatus,
  onToggleDebugMode,
  onManualStep,
  onRestartGame,
  onSkipCountdown,
}: PrimaryControlsProps) {
  const [stepCount, setStepCount] = useState(1);
  const [seedInput, setSeedInput] = useState('');

  const handleStepCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
    setStepCount(value);
  };

  const handleSeedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeedInput(e.target.value);
  };

  const handleRestartWithSeed = () => {
    const seed = seedInput.trim();
    onRestartGame(seed || undefined);
    setSeedInput('');
  };

  const presetSteps = [1, 5, 10, 30, 60];

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Controls
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onToggleDebugMode}
          variant={debugMode ? 'destructive' : 'secondary'}
          className="w-full"
        >
          {debugMode ? <Play /> : <Bug />}
          {debugMode ? 'Exit Debug' : 'Debug Mode'}
        </Button>
      </div>

      {gameStatus === 'countdown' && (
        <div className="flex gap-2">
          <Button onClick={onSkipCountdown} className="w-full">
            <Zap />
            Skip Countdown
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          New Game with Seed
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={seedInput}
            onChange={handleSeedInputChange}
            placeholder="Seed (optional)"
            className="w-36 rounded-md bg-muted px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
            title="Enter custom seed or leave empty for random"
          />
          <Button
            onClick={handleRestartWithSeed}
            variant="secondary"
            className="flex-1"
          >
            <Shuffle />
            Restart
          </Button>
        </div>
      </div>

      {debugMode && gameStatus === 'playing' && (
        <div className="space-y-2">
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Frame Stepping
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="999"
              value={stepCount}
              onChange={handleStepCountChange}
              className="w-24 rounded-md bg-muted px-4 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
              title="Number of frames to advance"
            />
            <Button onClick={() => onManualStep(stepCount)} className="flex-1">
              <SkipForward />
              Step {stepCount}
            </Button>
          </div>

          <div className="flex gap-1">
            {presetSteps.map(preset => (
              <button
                key={preset}
                onClick={() => setStepCount(preset)}
                className={`rounded px-2 py-1 text-xs transition-all ${
                  stepCount === preset
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-accent'
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
