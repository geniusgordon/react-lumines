import { useResponsiveScale } from '@/hooks';

import { Game } from './Game';

export const GameScreen: React.FC = () => {
  const { scale, ready } = useResponsiveScale({
    baseWidth: 704,
    minScale: 0.4,
    maxScale: 1.5,
    padding: 20,
  });

  if (!ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  return <Game scale={scale} />;
};
