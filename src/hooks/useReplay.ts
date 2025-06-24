import { useRef, useState, useCallback } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayInput, ReplayData } from '@/types/replay';

export function useReplay(gameState: GameState) {
  // Use refs to avoid re-renders during recording
  const recordedInputsRef = useRef<ReplayInput[]>([]);
  const currentReplayRef = useRef<ReplayData | null>(null);
  const playbackInputMapRef = useRef<Map<number, ReplayInput>>(new Map());

  // Only use state for flags that actually need to trigger re-renders
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayback, setIsPlayback] = useState(false);

  const startRecording = useCallback(() => {
    console.log('startRecording');
    recordedInputsRef.current = [];
    currentReplayRef.current = null;
    playbackInputMapRef.current = new Map();
    setIsRecording(true);
    setIsPlayback(false);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const recordInput = useCallback(
    (gameAction: GameAction) => {
      if (!isRecording) {
        return;
      }

      // Only record user input actions
      const recordableActions: GameAction['type'][] = [
        'MOVE_LEFT',
        'MOVE_RIGHT',
        'ROTATE_CW',
        'ROTATE_CCW',
        'SOFT_DROP',
        'HARD_DROP',
        'PAUSE',
        'RESUME',
      ];

      if (recordableActions.includes(gameAction.type)) {
        const replayInput: ReplayInput = {
          type: gameAction.type,
          frame: gameAction.frame,
          payload: gameAction.payload,
        };
        // Direct push to ref - no re-render
        recordedInputsRef.current.push(replayInput);
      }
    },
    [isRecording]
  );

  const startPlayback = useCallback((replayData: ReplayData) => {
    // Build frame -> input map for O(1) lookup during playback
    const inputMap = new Map<number, ReplayInput>();
    replayData.inputs.forEach(input => {
      inputMap.set(input.frame, input);
    });

    currentReplayRef.current = replayData;
    playbackInputMapRef.current = inputMap;
    setIsRecording(false);
    setIsPlayback(true);
  }, []);

  const stopPlayback = useCallback(() => {
    currentReplayRef.current = null;
    playbackInputMapRef.current = new Map();
    setIsPlayback(false);
  }, []);

  const getNextPlaybackInput = useCallback((): ReplayInput | null => {
    if (!isPlayback || !currentReplayRef.current) {
      return null;
    }

    if (playbackInputMapRef.current.size === 0) {
      return null;
    }

    const input = playbackInputMapRef.current.get(gameState.frame);
    return input || null;
  }, [isPlayback, gameState.frame]);

  const exportReplay = useCallback((): ReplayData | null => {
    if (!recordedInputsRef.current.length) {
      return null;
    }

    return {
      seed: gameState.seed,
      inputs: [...recordedInputsRef.current], // Create a copy
      gameConfig: {
        version: '1.0.0',
        timestamp: Date.now(),
      },
    };
  }, [gameState.seed]);

  return {
    replayState: {
      isRecording,
      isPlayback,
      currentReplay: currentReplayRef.current,
      recordedInputs: recordedInputsRef.current,
      playbackInputMap: playbackInputMapRef.current,
    },
    startRecording,
    stopRecording,
    recordInput,
    startPlayback,
    stopPlayback,
    getNextPlaybackInput,
    exportReplay,
  };
}
