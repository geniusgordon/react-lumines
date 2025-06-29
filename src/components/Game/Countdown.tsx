import { UI_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';
import type { GameState } from '@/types/game';

export interface CountdownProps {
  gameState: GameState;
}

export const Countdown: React.FC<CountdownProps> = props => {
  const { gameState } = props;
  const { status, countdown } = gameState;

  if (status !== 'countdown' && status !== 'countdownPaused') {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 flex h-full w-full items-center justify-center bg-black/30"
      style={{ ...getZIndexStyle(UI_Z_INDEX.MODALS) }}
    >
      <div className="text-center">
        <div className="text-game-text animate-pulse text-8xl font-bold">
          {countdown > 0 ? countdown : 'GO!'}
        </div>
      </div>
    </div>
  );
};
