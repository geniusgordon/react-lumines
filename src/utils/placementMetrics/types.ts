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

export interface RegionEff {
  color: 1 | 2;
  cells: number;
  windows: number; // internal 2x2 monochrome windows in this region
  efficiency: number; // windows / cells (0 when cells === 0)
}

export interface RegionEfficiencyResult {
  regions: RegionEff[];
  totalWindows: number; // sum across regions == detectPatterns(board).length
  totalCells: number;
  meanEfficiency: number; // mean of region.efficiency, 0 when no regions
}

export interface WellProfile {
  heights: number[]; // per-column stack height (BOARD_WIDTH entries)
  bumpiness: number; // sum of |height[x] - height[x+1]|
  maxWellDepth: number; // deepest <=1-wide gap (walls count as full height)
  deepWellCount: number; // wells with depth >= threshold
}

export interface FrozenGrowthResult {
  open: { light: number; dark: number }; // windows still able to close mono
  blocked: { light: number; dark: number }; // windows contaminated by opposite
  sealPressure: { light: number; dark: number }; // blocked/(open+blocked), 0 if denom 0
}

export interface PayoutColorRecord {
  dominantColor: 1 | 2;
  dominantShare: number; // share of cleared cells that were the dominant color, [0,1]
  postBalanceDelta: number; // board light-dark immediately AFTER the payout
}

export interface FocusRhythmStats {
  payoutCount: number;
  meanPurity: number; // mean dominantShare
  alternationRate: number; // fraction of consecutive payouts whose dominant color flipped
  handoffRate: number; // fraction of payouts whose residual leaned the OTHER color
}

export interface DecisionRegretResult {
  regret: number; // bestWindows - chosenWindows (>= 0)
  chosenWindows: number;
  bestWindows: number;
  bestX: number;
  bestRotation: number; // 0..3 clockwise quarter-turns from the block's current pattern
  chosenDead: number;
  bestDead: number;
}

export interface SweepValueStats {
  totalPoints: number; // sum of scoreDelta (== holding score paid out)
  meanPoints: number;
}
