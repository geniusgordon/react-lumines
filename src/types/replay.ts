export interface ReplayInput {
  type: string;
  frame: number;
  payload?: unknown;
}

export interface ReplayData {
  seed: string;
  inputs: ReplayInput[];
  gameConfig: {
    version: string;
    timestamp: number;
  };
  metadata?: {
    finalScore?: number;
    duration?: number;
    playerName?: string;
  };
}

export interface ReplayState {
  isRecording: boolean;
  isPlayback: boolean;
  currentReplay: ReplayData | null;
  recordedInputs: ReplayInput[];
}

export interface SavedReplay {
  id: string;
  name: string;
  data: ReplayData;
  savedAt: number;
}

export type ReplayAction =
  | { type: 'START_RECORDING'; seed: string }
  | { type: 'STOP_RECORDING' }
  | { type: 'START_PLAYBACK'; replayData: ReplayData }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'RECORD_INPUT'; input: ReplayInput }
  | { type: 'ADVANCE_PLAYBACK' }
  | { type: 'RESET_REPLAY' };
