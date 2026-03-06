import { useMemo, useEffect } from 'react';

import { useGameControls, useGamePlayer } from '@/hooks';
import type { UseResponsiveScaleReturn } from '@/hooks/useResponsiveScale';
import { readAndClearBranchState } from '@/utils/branchState';

import { GameCore } from './GameCore';

interface GamePlayerProps {
  scale: UseResponsiveScaleReturn;
  showDebugPanel?: boolean;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({
  scale,
  showDebugPanel = false,
}) => {
  const seed = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('seed') || undefined;
  }, []);

  // Use live gameplay hook
  const { gameState, gameLoop, actions, exportReplay, _dispatch } = useGamePlayer(
    seed,
    showDebugPanel
  );

  // Restore branched state if navigated here from a replay
  useEffect(() => {
    const branch = readAndClearBranchState();
    if (branch && branch.mode === 'play') {
      _dispatch({ type: 'RESTORE_STATE', payload: { ...branch.gameState, mode: 'normal', status: 'playing', undoStack: [] } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup controls for user input
  const controls = useGameControls(gameState, actions, {
    enableKeyRepeat: false,
    keyRepeatDelay: 100,
  });

  return (
    <div className="flex h-full w-full items-center justify-center">
      <GameCore
        key={gameState.seed}
        gameState={gameState}
        actions={actions}
        controls={controls}
        gameLoop={gameLoop}
        scale={scale}
        replayMode={false}
        exportReplay={exportReplay}
      />
    </div>
  );
};
