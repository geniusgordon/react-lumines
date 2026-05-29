import type { Position } from '@/types/game';

export interface ColorBalance {
  light: number; // total light (1) cells across all spawned blocks
  dark: number; // total dark (2) cells across all spawned blocks
  delta: number; // light - dark (signed)
  magnitudeRatio: number; // |delta| / total, in [0, 1]; 0 when total=0
  perDropCumulative: number[]; // running delta after each spawn (length === spawnedBlocks.length)
}

export interface DeadCellsResult {
  count: number;
  cells: Position[];
}

export interface SweepEvent {
  frame: number;
  clearedCells: number;
  scoreDelta: number;
  dropsSincePrevious: number;
}

export interface SweepYieldStats {
  total: number; // sum of clearedCells across all payouts
  mean: number; // total / events.length, 0 if no events
  perPayout: SweepEvent[]; // pass-through for callers that need detail
}
