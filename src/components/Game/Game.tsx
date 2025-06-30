import { useMemo } from 'react';

import { useResponsiveScale } from '@/hooks';
import type { ReplayData } from '@/types/replay';

import { GamePlayer } from './GamePlayer';
import { ReplayPlayer } from './ReplayPlayer';

interface GameProps {
  replayMode?: boolean;
  replayData?: ReplayData;
}

export const Game: React.FC<GameProps> = ({
  replayMode = false,
  replayData,
}) => {
  const scale = useResponsiveScale({
    baseWidth: 704,
    minScale: 0.4,
    maxScale: 1.2,
    padding: 20,
  });

  // Check if debug panel should be shown
  const showDebugPanel = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true';
  }, []);

  if (!scale.ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  // Conditionally render appropriate player component
  if (replayMode && replayData) {
    return (
      <ReplayPlayer
        scale={scale}
        replayData={replayData}
        showDebugPanel={showDebugPanel}
      />
    );
  }

  return <GamePlayer scale={scale} showDebugPanel={showDebugPanel} />;
};
