import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  RotateCcw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getZIndexStyle, UI_Z_INDEX } from '@/constants/zIndex';

import { ProgressBar } from './ProgressBar';
import { SpeedSelector } from './SpeedSelector';

export interface ReplayControllerProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  frameRate?: number;
  onPlayPause: () => void;
  onRestart: () => void;
  onSeek: (frame: number) => void;
  onSpeedChange: (speed: number) => void;
  onStepFrames: (delta: number) => void;
}

export function ReplayController({
  isPlaying,
  currentFrame,
  totalFrames,
  speed,
  frameRate = 60,
  onPlayPause,
  onRestart,
  onSeek,
  onSpeedChange,
  onStepFrames,
}: ReplayControllerProps) {
  const progress = totalFrames > 0 ? currentFrame / totalFrames : 0;

  const formatTime = (frame: number): string => {
    const seconds = Math.floor(frame / frameRate);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const stepAmount = Math.max(1, Math.floor(frameRate));

  return (
    <div
      className="rounded-lg border border-border bg-card/95 px-6 py-4 shadow-xl backdrop-blur-sm"
      style={{
        ...getZIndexStyle(UI_Z_INDEX.DROPDOWN),
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex flex-1 items-center justify-center gap-4">
        <div className="flex w-[120px] justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={onRestart}
            aria-label="Restart"
          >
            <RotateCcw />
          </Button>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onStepFrames(-stepAmount)}
          aria-label={`Step back ${stepAmount} frames`}
        >
          <SkipBack />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onStepFrames(-1)}
          aria-label="Step back 1 frame"
        >
          <StepBack />
        </Button>

        {/* Main Play/Pause Button */}
        <Button
          size="icon"
          onClick={onPlayPause}
          className="rounded-full bg-foreground text-background hover:scale-105 hover:bg-foreground"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onStepFrames(1)}
          aria-label="Step forward 1 frame"
        >
          <StepForward />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onStepFrames(stepAmount)}
          aria-label={`Step forward ${stepAmount} frames`}
        >
          <SkipForward />
        </Button>

        <div className="w-[120px] overflow-visible">
          <SpeedSelector
            speed={speed}
            onSpeedChange={onSpeedChange}
            aria-label="Playback speed"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="min-w-[35px] text-right font-mono tabular-nums">
          {formatTime(currentFrame)}
        </span>

        <div className="group flex-1">
          <ProgressBar
            progress={progress}
            onSeek={onSeek}
            totalFrames={totalFrames}
          />
        </div>

        <span className="min-w-[35px] font-mono tabular-nums">
          {formatTime(totalFrames)}
        </span>
      </div>

      <div className="mt-1 text-center">
        <span className="font-mono text-xs text-muted-foreground">
          {currentFrame.toLocaleString()} / {totalFrames.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
