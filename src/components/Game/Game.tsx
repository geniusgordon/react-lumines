import { useMemo } from 'react';

import { useResponsiveScale } from '@/hooks';
import type { ExpandedReplayData } from '@/types/replay';

import { GamePlayer } from './GamePlayer';
import { ReplayPlayer } from './ReplayPlayer';

interface GameProps {
  replayMode?: boolean;
  replayData?: ExpandedReplayData;
}

export const Game: React.FC<GameProps> = ({
  replayMode = false,
  replayData,
}) => {
  const scale = useResponsiveScale({
    minScale: 0.5,
    maxScale: 2,
    padding: 40,
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
