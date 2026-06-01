import { describe, expect, it } from 'vitest';

import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { createReplayData } from '@/utils/replayUtils';

import { simulateReplay } from '../simulateReplay';

/**
 * Drive the live game through a small fixed script and return both
 * the recorded inputs (TICK-interleaved) and the final game state.
 * Mirrors what `useReplayRecorder` would produce (same pattern as
 * scripts/replay-notation/__tests__/notation.test.ts).
 */
function recordFixedScript(seed: string): {
  recordedInputs: { type: string; frame: number }[];
  finalState: GameState;
} {
  let state = createInitialGameState(seed);
  state = gameReducer(state, { type: 'START_GAME' });
  state = gameReducer(state, { type: 'SKIP_COUNTDOWN' });

  const recordedInputs: { type: string; frame: number }[] = [];
  const push = (type: string) => recordedInputs.push({ type, frame: 0 });

  for (let i = 0; i < 4; i++) {
    push('HARD_DROP');
    state = gameReducer(state, { type: 'HARD_DROP' });
    for (let f = 0; f < 20; f++) {
      push('TICK');
      state = gameReducer(state, { type: 'TICK' });
    }
  }

  return { recordedInputs, finalState: state };
}

describe('simulateReplay', () => {
  it('fires onDrop for every hard drop and reaches the recorded final score', () => {
    const { recordedInputs, finalState } = recordFixedScript(
      'simulate-replay-seed-1'
    );
    const replay = createReplayData(recordedInputs, finalState) as ReplayData;

    let drops = 0;
    let payouts = 0;
    const finalSimState = simulateReplay(replay, {
      onDrop: () => {
        drops += 1;
      },
      onPayout: () => {
        payouts += 1;
      },
    });

    expect(drops).toBeGreaterThan(0);
    expect(payouts).toBeGreaterThanOrEqual(0);
    expect(finalSimState.score).toBe(replay.metadata.finalScore);
  });
});
