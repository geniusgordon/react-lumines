import type { GameAction, GameState } from './game';

export interface ReplayInput {
  type: string;
  frame: number;
  payload?: unknown;
}

export interface StateSnapshot {
  frame: number;
  gameState: GameState;
}

export interface ReplayData {
  id: string;
  seed: string;
  inputs: ReplayInput[];
  gameConfig: {
    version: string;
    timestamp: number;
  };
  metadata: {
    finalScore: number;
    duration?: number;
    playerName?: string;
  };
}

// Frame-based action structure
export interface FrameActions {
  frame: number;
  userActions: GameAction[];
}

// Enhanced replay data with snapshots for seeking optimization
export type ExpandedReplayData = ReplayData & {
  frameActions: FrameActions[];
  snapshots: StateSnapshot[];
  analytics: ReplayAnalytics;
};

export interface SavedReplay {
  id: string;
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

// Analytics types
export interface ScorePoint {
  frame: number;
  score: number;
}

export interface KeyMoment {
  frame: number;
  scoreDelta: number;
  chainLength: number;
}

export interface ColumnHeatmap {
  counts: number[]; // length 16
  max: number;
}

export interface ReplayAnalytics {
  scoreTimeline: ScorePoint[];
  peakChainLength: number;
  peakChainFrame: number;
  boardEfficiency: number; // 0-1: cells in patterns / total non-empty at final snapshot
  keyMoments: KeyMoment[]; // frames where scoreDelta >= KEY_MOMENT_THRESHOLD
  columnHeatmap: ColumnHeatmap;
  scoreDistribution: { small: number; medium: number; large: number };
}

// Controller action handlers
export interface ReplayControllerHandlers {
  onPlayPause: () => void;
  onRestart: () => void;
  onSeek: (frame: number) => void;
  onSpeedChange: (speed: number) => void;
  onStepFrames: (delta: number) => void;
}
