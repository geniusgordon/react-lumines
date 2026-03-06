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
  markers?: { frame: number }[];
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
  markers,
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
      className="border-border bg-card/95 rounded-lg border px-6 py-4 shadow-xl backdrop-blur-sm"
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
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full hover:scale-105"
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

      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
        <span className="min-w-[35px] text-right tabular-nums">
          {formatTime(currentFrame)}
        </span>

        <div className="group flex-1">
          <ProgressBar
            progress={progress}
            onSeek={onSeek}
            totalFrames={totalFrames}
            markers={markers}
          />
        </div>

        <span className="min-w-[35px] tabular-nums">
          {formatTime(totalFrames)}
        </span>
      </div>

      <div className="mt-1 text-center">
        <span className="text-muted-foreground text-xs tabular-nums">
          {currentFrame.toLocaleString()} / {totalFrames.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
