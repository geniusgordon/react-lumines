import { useEffect } from 'react';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { useGame } from '@/hooks/useGame';
import { useAiLoop } from '@/hooks/useAiLoop';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import { useGameControls } from '@/hooks/useGameControls';

export function AiWatchScreen() {
  const navigate = useNavigate();
  const { gameState, actions, _dispatch } = useGame();
  const aiLoop = useAiLoop(gameState, _dispatch);
  const scale = useResponsiveScale({ minScale: 0.5, maxScale: 2, padding: 40 });
  const controls = useGameControls(gameState, actions, { enableKeyRepeat: false });

  // Auto-start when screen loads
  useEffect(() => {
    if (gameState.status === 'initial') {
      actions.startNewGame();
    }
  }, [gameState.status, actions]);

  if (!scale.ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-game-background relative flex h-screen w-full flex-col items-center justify-center">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Menu</span>
        </button>

        <div className="flex items-center gap-2 text-sm">
          {aiLoop.isConnected ? (
            <>
              <Wifi size={14} className="text-green-400" />
              <span className="text-green-400">AI Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-yellow-400" />
              <span className="text-yellow-400">
                Waiting for AI server… run: python python/ws_eval.py
              </span>
            </>
          )}
        </div>

        <div className="text-sm text-gray-500">{aiLoop.currentFPS} fps</div>
      </div>

      {/* Game */}
      <GameCore
        key={gameState.seed}
        gameState={gameState}
        actions={actions}
        controls={controls}
        gameLoop={aiLoop}
        scale={scale}
        replayMode={true}
        exportReplay={() => null}
      />
    </div>
  );
}
