import {
  GameLayout,
  PauseMenu,
  GameOverMenu,
  Countdown,
} from '@/components/Game';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import type { UseControlsReturn, UseGameLoopReturn } from '@/hooks';
import type { GameState } from '@/types/game';

import { DebugPanel } from '../DebugPanel';

interface GameCoreProps {
  gameState: GameState;
  dispatch: (action: any) => void;
  controls: UseControlsReturn;
  gameLoop?: UseGameLoopReturn | null;
  showDebugPanel: boolean;
  scale: number;
}

export const GameCore: React.FC<GameCoreProps> = ({
  gameState,
  dispatch,
  controls,
  gameLoop,
  showDebugPanel,
  scale,
}) => {
  // Extract game loop properties (with fallbacks for replay mode)
  const { isRunning, currentFPS, frameCount, manualStep, isDebugMode } =
    gameLoop || {
      isRunning: false,
      currentFPS: 0,
      frameCount: 0,
      manualStep: () => {},
      isDebugMode: false,
    };

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {showDebugPanel && (
        <DebugPanel
          gameState={gameState}
          dispatch={dispatch}
          frameCount={frameCount}
          currentFPS={currentFPS}
          isRunning={isRunning}
          isDebugMode={isDebugMode}
          manualStep={manualStep}
          controls={controls}
          scale={scale}
        />
      )}

      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <GameLayout gameState={gameState} />
      </div>

      <Countdown gameState={gameState} />

      <PauseMenu
        gameState={gameState}
        controlsConfig={DEFAULT_CONTROLS}
        dispatch={dispatch}
      />

      <GameOverMenu
        gameState={gameState}
        controlsConfig={DEFAULT_CONTROLS}
        dispatch={dispatch}
      />
    </div>
  );
};
