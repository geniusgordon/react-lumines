import { useRef, useCallback } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayInput, ReplayData } from '@/types/replay';
import { createReplayData } from '@/utils/replayUtils';

export function useReplayRecorder(gameState: GameState) {
  // Use refs to avoid re-renders during recording
  const recordedInputsRef = useRef<ReplayInput[]>([]);

  const startRecording = useCallback(() => {
    recordedInputsRef.current = [];
  }, []);

  const recordInput = useCallback(
    (gameAction: GameAction) => {
      if (gameState.status !== 'playing') {
        return;
      }

      // Record ALL actions (including TICK) - we'll compact later
      const replayInput: ReplayInput = {
        type: gameAction.type,
        frame: 0, // Frame will be calculated during compaction
        payload: gameAction.payload,
      };
      // Direct push to ref - no re-render
      recordedInputsRef.current.push(replayInput);
    },
    [gameState.status]
  );

  const exportReplay = useCallback((): ReplayData | null => {
    if (!recordedInputsRef.current.length) {
      return null;
    }

    return createReplayData(
      recordedInputsRef.current,
      gameState.seed,
      gameState.score
    );
  }, [gameState.seed, gameState.score]);

  return {
    startRecording,
    recordInput,
    exportReplay,
  };
}
