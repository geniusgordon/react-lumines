import { useState, useRef, useCallback } from 'react';

export interface ProgressBarProps {
  progress: number; // 0-1
  totalFrames: number;
  onSeek: (frame: number) => void;
}

export function ProgressBar({
  progress,
  totalFrames,
  onSeek,
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const getProgressFromEvent = useCallback((event: React.MouseEvent) => {
    if (!progressRef.current) {
      return 0;
    }

    const rect = progressRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, x / width));
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const newProgress = getProgressFromEvent(event);
      const newFrame = Math.floor(newProgress * totalFrames);

      setIsDragging(true);
      onSeek(newFrame);

      const handleMouseMove = (e: MouseEvent) => {
        if (!progressRef.current) {
          return;
        }

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const prog = Math.max(0, Math.min(1, x / width));
        const frame = Math.floor(prog * totalFrames);

        onSeek(frame);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [getProgressFromEvent, totalFrames, onSeek]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging) {
        return;
      }
      const newProgress = getProgressFromEvent(event);
      setHoverProgress(newProgress);
    },
    [isDragging, getProgressFromEvent]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverProgress(null);
  }, []);

  const displayProgress = isDragging ? progress : (hoverProgress ?? progress);
  const currentDisplayFrame = Math.floor(displayProgress * totalFrames);

  const formatTime = (frame: number) => {
    const seconds = Math.floor(frame / 60);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* Progress Bar Container */}
      <div
        ref={progressRef}
        className="group relative h-2 cursor-pointer rounded-full bg-gray-700 transition-all hover:h-3"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Progress */}
        <div className="h-full rounded-full bg-gray-600" />

        {/* Filled Progress */}
        <div
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          style={{ width: `${displayProgress * 100}%` }}
        />

        {/* Progress Handle */}
        <div
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-lg transition-transform ${
            isDragging || hoverProgress !== null
              ? 'scale-110 opacity-100'
              : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'
          }`}
          style={{ left: `calc(${displayProgress * 100}% - 8px)` }}
        />

        {/* Hover Tooltip */}
        {hoverProgress !== null && !isDragging && (
          <div
            className="absolute bottom-6 min-w-[120px] -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white"
            style={{ left: `${hoverProgress * 100}%` }}
          >
            <div className="text-center">
              <div>{formatTime(currentDisplayFrame)}</div>
              <div className="text-gray-400">Frame {currentDisplayFrame}</div>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-t-4 border-r-2 border-l-2 border-t-black/80 border-r-transparent border-l-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
