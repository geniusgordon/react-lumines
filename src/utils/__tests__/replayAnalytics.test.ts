import { describe, expect, it } from 'vitest';

import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameState } from '@/types/game';
import {
  createReplayData,
  expandReplayDataWithSnapshots,
} from '@/utils/replayUtils';

function runSmallScript(seed: string): GameState {
  let s = createInitialGameState(seed);
  s = gameReducer(s, { type: 'START_GAME' });
  s = gameReducer(s, { type: 'SKIP_COUNTDOWN' });
  for (let i = 0; i < 6; i++) {
    s = gameReducer(s, { type: 'HARD_DROP' });
    for (let f = 0; f < 30; f++) {
      s = gameReducer(s, { type: 'TICK' });
    }
  }
  return s;
}

describe('replayAnalytics — sweepYield', () => {
  it('includes a sweepYield field with total/mean/payouts', () => {
    const final = runSmallScript('analytics-yield-seed');
    const replay = createReplayData([], final);
    const expanded = expandReplayDataWithSnapshots(replay);

    expect(expanded.analytics.sweepYield).toBeDefined();
    expect(expanded.analytics.sweepYield.total).toBeGreaterThanOrEqual(0);
    expect(expanded.analytics.sweepYield.payouts).toBeGreaterThanOrEqual(0);
    if (expanded.analytics.sweepYield.payouts > 0) {
      expect(expanded.analytics.sweepYield.mean).toBeGreaterThan(0);
    }
  });
});
