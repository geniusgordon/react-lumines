import type { Position } from '@/types/game';

export interface BoardColorBalance {
  light: number; // light (1) cells currently on the board
  dark: number; // dark (2) cells currently on the board
  delta: number; // light - dark (signed); what the player's placements + clears produced
  magnitudeRatio: number; // |delta| / total non-empty cells, in [0, 1]; 0 when board empty
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
