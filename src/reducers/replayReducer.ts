import type { ReplayState, ReplayAction, ReplayInput } from '@/types/replay';

export function createInitialReplayState(): ReplayState {
  return {
    isRecording: false,
    isPlayback: false,
    currentReplay: null,
    recordedInputs: [],
    playbackInputMap: new Map(),
  };
}

export function replayReducer(
  state: ReplayState,
  action: ReplayAction
): ReplayState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        isPlayback: false,
        recordedInputs: [],
        currentReplay: null,
        playbackInputMap: new Map(),
      };

    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
      };

    case 'START_PLAYBACK': {
      // Build frame -> input map for O(1) lookup during playback
      const inputMap = new Map<number, ReplayInput>();
      action.replayData.inputs.forEach(input => {
        inputMap.set(input.frame, input);
      });

      return {
        ...state,
        isRecording: false,
        isPlayback: true,
        currentReplay: action.replayData,
        playbackInputMap: inputMap,
      };
    }

    case 'STOP_PLAYBACK':
      return {
        ...state,
        isPlayback: false,
        currentReplay: null,
        playbackInputMap: new Map(),
      };

    case 'RECORD_INPUT':
      if (!state.isRecording) {
        return state;
      }

      return {
        ...state,
        recordedInputs: [...state.recordedInputs, action.input],
      };

    case 'RESET_REPLAY':
      return createInitialReplayState();

    default:
      return state;
  }
}
