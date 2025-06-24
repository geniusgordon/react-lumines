import { useResponsiveScale } from '@/hooks';
import type { ReplayData } from '@/types/replay';

import { GameCore } from './GameCore';

interface GameProps {
  replayMode?: boolean;
  replayData?: ReplayData;
}

export const Game: React.FC<GameProps> = ({
  replayMode = false,
  replayData,
}) => {
  const { scale, ready } = useResponsiveScale({
    baseWidth: 704,
    minScale: 0.4,
    maxScale: 1.2,
    padding: 20,
  });

  if (!ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  return (
    <GameCore scale={scale} replayMode={replayMode} replayData={replayData} />
  );
};
