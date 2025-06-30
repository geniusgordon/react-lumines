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
  | { type: 'RESET_REPLAY' }
  | { type: 'SEEK_TO_FRAME'; frame: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'STEP_FRAMES'; delta: number };

// Controller state for replay playback
export interface ReplayControllerState {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  isBuffering: boolean;
}

// Controller action handlers
export interface ReplayControllerHandlers {
  onPlayPause: () => void;
  onRestart: () => void;
  onSeek: (frame: number) => void;
  onSpeedChange: (speed: number) => void;
  onStepFrames: (delta: number) => void;
}
