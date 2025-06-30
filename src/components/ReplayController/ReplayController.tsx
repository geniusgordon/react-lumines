import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  RotateCcw,
} from 'lucide-react';

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
      className="rounded-lg border border-gray-600/50 bg-gray-900/95 px-6 py-4 shadow-xl backdrop-blur-sm"
      style={{
        ...getZIndexStyle(UI_Z_INDEX.DROPDOWN),
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex flex-1 items-center justify-center gap-4">
        <div className="flex w-[120px] justify-end">
          <button
            onClick={onRestart}
            className="p-1 text-gray-400 transition-colors hover:text-white"
            aria-label="Restart"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <button
          onClick={() => onStepFrames(-stepAmount)}
          className="p-1 text-gray-400 transition-colors hover:text-white"
          aria-label={`Step back ${stepAmount} frames`}
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={() => onStepFrames(-1)}
          className="p-1 text-gray-400 transition-colors hover:text-white"
          aria-label="Step back 1 frame"
        >
          <StepBack size={18} />
        </button>

        {/* Main Play/Pause Button */}
        <button
          onClick={onPlayPause}
          className="rounded-full bg-white p-2 text-black transition-transform hover:scale-105"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </button>

        <button
          onClick={() => onStepFrames(1)}
          className="p-1 text-gray-400 transition-colors hover:text-white"
          aria-label="Step forward 1 frame"
        >
          <StepForward size={18} />
        </button>

        <button
          onClick={() => onStepFrames(stepAmount)}
          className="p-1 text-gray-400 transition-colors hover:text-white"
          aria-label={`Step forward ${stepAmount} frames`}
        >
          <SkipForward size={20} />
        </button>

        <div className="w-[120px] overflow-visible">
          <SpeedSelector
            speed={speed}
            onSpeedChange={onSpeedChange}
            aria-label="Playback speed"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
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
        <span className="font-mono text-xs text-gray-500">
          {currentFrame.toLocaleString()} / {totalFrames.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
