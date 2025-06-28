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
import type { ReplayData } from '@/types/replay';

import { DebugPanel } from '../DebugPanel';

interface GameCoreProps {
  gameState: GameState;
  actions: UseGameActions;
  controls: UseControlsReturn;
  gameLoop?: UseGameLoopReturn | null;
  scale: number;
  replayMode?: boolean;
  exportReplay: () => ReplayData | null;
}

export const GameCore: React.FC<GameCoreProps> = ({
  gameState,
  actions,
  controls,
  gameLoop,
  scale,
  replayMode = false,
  exportReplay,
}) => {
  // Extract game loop properties (with fallbacks for replay mode)
  const { isRunning, currentFPS, manualStep } = gameLoop || {
    isRunning: false,
    currentFPS: 0,
    manualStep: () => {},
  };

  return (
    <div className="bg-game-background flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {gameState.debugMode && (
        <DebugPanel
          gameState={gameState}
          actions={actions}
          frameCount={gameState.frame}
          currentFPS={currentFPS}
          isRunning={isRunning}
          manualStep={manualStep}
          controls={controls}
          scale={scale}
          exportReplay={exportReplay}
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
