import { useRef, useState, useCallback } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayInput, ReplayData } from '@/types/replay';

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

    // Compact the recorded actions: filter out TICKs and calculate frame numbers
    const compactInputs: ReplayInput[] = [];
    let currentFrame = 0;

    for (const action of recordedInputsRef.current) {
      if (action.type === 'TICK') {
        // TICK actions advance the frame counter
        currentFrame++;
      } else {
        // User input actions get recorded with current frame
        compactInputs.push({
          type: action.type,
          frame: currentFrame,
          payload: action.payload,
        });
      }
    }

    return {
      seed: gameState.seed,
      inputs: compactInputs,
      gameConfig: {
        version: '1.0.0',
        timestamp: Date.now(),
      },
    };
  }, [gameState.seed]);

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
