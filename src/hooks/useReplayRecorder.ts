import { useRef, useState, useCallback } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayInput, ReplayData } from '@/types/replay';
import { createReplayData } from '@/utils/replayUtils';

export function useReplayRecorder(gameState: GameState) {
  // Use refs to avoid re-renders during recording
  const recordedInputsRef = useRef<ReplayInput[]>([]);

  // Only use state for flags that actually need to trigger re-renders
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(() => {
    recordedInputsRef.current = [];
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const recordInput = useCallback(
    (gameAction: GameAction) => {
      if (!isRecording) {
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
    [isRecording]
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
    replayState: {
      isRecording,
      recordedInputs: recordedInputsRef.current,
    },
    startRecording,
    stopRecording,
    recordInput,
    exportReplay,
  };
}
