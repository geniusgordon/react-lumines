import { useEffect, useState } from 'react';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { useGame } from '@/hooks/useGame';
import { useAiLoop } from '@/hooks/useAiLoop';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import { useGameControls } from '@/hooks/useGameControls';

const DEFAULT_WS_URL = 'ws://localhost:8765';
const LS_KEY = 'ai-watch-ws-url';

export function AiWatchScreen() {
  const navigate = useNavigate();
  const [wsUrl, setWsUrl] = useState(
    () => localStorage.getItem(LS_KEY) ?? DEFAULT_WS_URL
  );
  const [draft, setDraft] = useState(wsUrl);

  const { gameState, actions, _dispatch } = useGame();
  const aiLoop = useAiLoop(gameState, _dispatch, { wsUrl });
  const scale = useResponsiveScale({ minScale: 0.5, maxScale: 2, padding: 40 });
  const controls = useGameControls(gameState, actions, { enableKeyRepeat: false, disabled: aiLoop.isConnected });

  // Auto-start when screen loads
  useEffect(() => {
    if (gameState.status === 'initial') {
      actions.startNewGame();
    }
  }, [gameState.status, actions]);

  function applyUrl(url: string) {
    const trimmed = url.trim();
    setWsUrl(trimmed);
    setDraft(trimmed);
    localStorage.setItem(LS_KEY, trimmed);
  }

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
              <span className="text-gray-600">({wsUrl})</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-yellow-400" />
              <form
                onSubmit={(e) => { e.preventDefault(); applyUrl(draft); }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="rounded border border-gray-600 bg-gray-800 px-2 py-0.5 text-xs text-white w-52 focus:outline-none focus:border-gray-400"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="rounded bg-gray-700 px-2 py-0.5 text-xs text-white hover:bg-gray-600"
                >
                  Connect
                </button>
              </form>
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
