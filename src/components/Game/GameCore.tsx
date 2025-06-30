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
import type { UseResponsiveScaleReturn } from '@/hooks/useResponsiveScale';
import type { GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';

import { DebugPanel } from '../DebugPanel';

interface GameCoreProps {
  gameState: GameState;
  actions: UseGameActions;
  controls: UseControlsReturn;
  gameLoop: UseGameLoopReturn;
  scale: UseResponsiveScaleReturn;
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
  const { isRunning, currentFPS, manualStep } = gameLoop;

  return (
    <div
      className="bg-game-background isolate flex flex-col items-center justify-center"
      style={{
        width: scale.scaledWidth,
        height: scale.scaledHeight,
      }}
    >
      {gameState.debugMode && (
        <DebugPanel
          gameState={gameState}
          actions={actions}
          frameCount={gameState.frame}
          currentFPS={currentFPS}
          isRunning={isRunning}
          manualStep={manualStep}
          controls={controls}
          scale={scale.scale}
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
