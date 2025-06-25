import { useRef, useState, useCallback } from 'react';

import type { GameAction, GameState } from '@/types/game';
import type { ReplayInput, ReplayData } from '@/types/replay';

export function useReplay(gameState: GameState) {
  // Use refs to avoid re-renders during recording
  const recordedInputsRef = useRef<ReplayInput[]>([]);
  const currentReplayRef = useRef<ReplayData | null>(null);

  // Only use state for flags that actually need to trigger re-renders
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayback, setIsPlayback] = useState(false);

  const startRecording = useCallback(() => {
    recordedInputsRef.current = [];
    currentReplayRef.current = null;
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

  // Reverse compaction: expand compact replay data into full action sequence
  const expandReplayData = useCallback(
    (replayData: ReplayData): GameAction[] => {
      const expandedActions: GameAction[] = [];
      let currentFrame = 0;

      // Find the maximum frame number to know when to stop
      const maxFrame =
        replayData.inputs.length > 0
          ? Math.max(...replayData.inputs.map(input => input.frame))
          : 0;

      // Generate sequence of actions with TICK actions inserted
      while (currentFrame <= maxFrame) {
        // Check if there's a user input at this frame
        const inputAtFrame = replayData.inputs.find(
          input => input.frame === currentFrame
        );

        if (inputAtFrame) {
          // Add user input action first
          expandedActions.push({
            type: inputAtFrame.type as any, // Type assertion needed for GameActionType
            payload: inputAtFrame.payload,
          });
        }

        // Always add TICK action (except for the very last frame to avoid extra tick)
        if (currentFrame <= maxFrame) {
          expandedActions.push({
            type: 'TICK',
          });
        }

        currentFrame++;
      }

      return expandedActions;
    },
    []
  );

  // New playback mechanism using sequenced actions
  const playbackActionsRef = useRef<GameAction[]>([]);
  const playbackIndexRef = useRef<number>(0);

  const startSequencedPlayback = useCallback(
    (replayData: ReplayData) => {
      // Expand replay data into full action sequence
      const expandedActions = expandReplayData(replayData);

      // Store the sequence and reset index
      playbackActionsRef.current = expandedActions;
      playbackIndexRef.current = 0;

      currentReplayRef.current = replayData;
      setIsRecording(false);
      setIsPlayback(true);
    },
    [expandReplayData]
  );

  const getNextSequencedAction = useCallback((): GameAction | null => {
    if (
      !isPlayback ||
      playbackIndexRef.current >= playbackActionsRef.current.length
    ) {
      return null;
    }

    const action = playbackActionsRef.current[playbackIndexRef.current];
    playbackIndexRef.current++;
    return action;
  }, [isPlayback]);

  const stopSequencedPlayback = useCallback(() => {
    playbackActionsRef.current = [];
    playbackIndexRef.current = 0;
    currentReplayRef.current = null;
    setIsPlayback(false);
  }, []);

  return {
    replayState: {
      isRecording,
      isPlayback,
      currentReplay: currentReplayRef.current,
      recordedInputs: recordedInputsRef.current,
    },
    startRecording,
    stopRecording,
    recordInput,
    exportReplay,
    expandReplayData,
    startSequencedPlayback,
    getNextSequencedAction,
    stopSequencedPlayback,
  };
}
