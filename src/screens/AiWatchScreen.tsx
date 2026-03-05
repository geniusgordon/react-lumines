import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { Button } from '@/components/ui/button';
import { useAiLoop } from '@/hooks/useAiLoop';
import { useGame } from '@/hooks/useGame';
import { useGameControls } from '@/hooks/useGameControls';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';

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
  const controls = useGameControls(gameState, actions, {
    enableKeyRepeat: false,
    disabled: true,
  });

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
      <div className="absolute top-0 right-0 left-0 flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft />
          Menu
        </Button>

        <div className="flex items-center gap-2 text-sm">
          {aiLoop.isConnected ? (
            <>
              <Wifi size={14} className="text-success" />
              <span className="text-success">AI Connected</span>
              <span className="text-muted-foreground">({wsUrl})</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-warning" />
              <form
                onSubmit={e => {
                  e.preventDefault();
                  applyUrl(draft);
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  className="w-52 rounded border border-border bg-muted px-2 py-0.5 text-xs text-foreground focus:border-ring focus:outline-none"
                  spellCheck={false}
                />
                <Button type="submit" variant="secondary" size="sm">
                  Connect
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="text-sm text-muted-foreground">{aiLoop.currentFPS} fps</div>
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
