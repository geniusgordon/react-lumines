import {
  GameLayout,
  PauseMenu,
  GameOverMenu,
  Countdown,
} from '@/components/Game';
import { DEFAULT_CONTROLS } from '@/constants/gameConfig';
import type {
  UseControlsReturn,
  UseGameLoopReturn,
  UseGameActions,
} from '@/hooks';
import type { GameState } from '@/types/game';

import { DebugPanel } from '../DebugPanel';

interface GameCoreProps {
  gameState: GameState;
  actions: UseGameActions;
  controls: UseControlsReturn;
  gameLoop?: UseGameLoopReturn | null;
  showDebugPanel: boolean;
  scale: number;
  replayMode?: boolean;
}

export const GameCore: React.FC<GameCoreProps> = ({
  gameState,
  actions,
  controls,
  gameLoop,
  showDebugPanel,
  scale,
  replayMode = false,
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
      {gameState.debugMode && (
        <DebugPanel
          gameState={gameState}
          actions={actions}
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
        actions={actions}
        replayMode={replayMode}
      />

      <GameOverMenu
        gameState={gameState}
        controlsConfig={DEFAULT_CONTROLS}
        actions={actions}
        replayMode={replayMode}
      />
    </div>
  );
};
