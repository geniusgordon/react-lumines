import type { GameState } from '@/types/game';

const BRANCH_STATE_KEY = '@lumines/branch-state';

export interface BranchState {
  gameState: GameState;
  sourceReplayId: string;
  sourceFrame: number;
  mode: 'play' | 'training';
}

export function writeBranchState(state: BranchState): void {
  sessionStorage.setItem(BRANCH_STATE_KEY, JSON.stringify(state));
}

export function readAndClearBranchState(): BranchState | null {
  const raw = sessionStorage.getItem(BRANCH_STATE_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(BRANCH_STATE_KEY);
  try {
    return JSON.parse(raw) as BranchState;
  } catch {
    return null;
  }
}
