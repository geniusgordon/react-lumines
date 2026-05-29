import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { ScreenHeader } from '@/components/ScreenHeader';
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
      <ScreenHeader
        onBack={() => navigate('/')}
        center={
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
                    className="border-border bg-muted text-foreground focus:border-ring w-52 rounded border px-2 py-0.5 text-xs focus:outline-none"
                    spellCheck={false}
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    Connect
                  </Button>
                </form>
              </>
            )}
          </div>
        }
        actions={
          <span className="text-muted-foreground text-sm">
            {aiLoop.currentFPS} fps
          </span>
        }
      />

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
