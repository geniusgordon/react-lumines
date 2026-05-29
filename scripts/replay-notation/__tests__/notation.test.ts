import { describe, expect, it } from 'vitest';

import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { createReplayData } from '@/utils/replayUtils';

import { replayToNotation } from '../notation';

/**
 * Drive the live game through a small fixed script and return both
 * the recorded inputs (TICK-interleaved) and the final game state.
 * Mirrors what `useReplayRecorder` would produce.
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

describe('replayToNotation', () => {
  it('produces a non-empty markdown record with header, drops, and final score', () => {
    const { recordedInputs, finalState } = recordFixedScript('notation-seed-1');
    const replay = createReplayData(recordedInputs, finalState);

    const md = replayToNotation(replay, { source: 'fixture.json' });

    expect(md).toContain('# Replay fixture.json');
    expect(md).toContain(`- seed: ${replay.seed}`);
    expect(md).toContain('- schema version: 2');
    expect(md).toContain(`- final score: ${finalState.score}`);
    expect(md).toContain('drops: 4');
    // Each drop line begins with #NN.
    expect(md).toMatch(/#01\s+f=/);
    expect(md).toMatch(/#04\s+f=/);
    // At least one ASCII board row appears.
    expect(md).toMatch(/timeline@col=[0-9A-F]/);
  });

  it('is deterministic for the same replay (byte-identical output)', () => {
    const { recordedInputs, finalState } = recordFixedScript('determ-seed');
    const replay = createReplayData(recordedInputs, finalState);

    const a = replayToNotation(replay, { source: 'x.json' });
    const b = replayToNotation(replay, { source: 'x.json' });
    expect(a).toBe(b);
  });

  it('reproduces the same final score when re-simulated (v2 round-trip)', () => {
    const { recordedInputs, finalState } = recordFixedScript('rt-seed');
    const replay = createReplayData(recordedInputs, finalState);

    const md = replayToNotation(replay, { source: 'rt.json' });

    // The notation header reflects the simulated final score, which must
    // match what the live game produced.
    expect(md).toContain(`- final score: ${finalState.score}`);
  });

  it('produces RNG-independent output for v2 replays (different seed in header still resimulates from blockQueue)', () => {
    const { recordedInputs, finalState } = recordFixedScript('original-seed');
    const replay = createReplayData(recordedInputs, finalState);

    // Tamper the seed but keep the v2 blockQueue.
    const tampered: ReplayData = { ...replay, seed: 'unrelated-seed' };

    const original = replayToNotation(replay, { source: 'r.json' });
    const tamperedOut = replayToNotation(tampered, { source: 'r.json' });

    // Drop lines (block glyphs + columns) come from the blockQueue, so the
    // body should match between the original and the seed-tampered version.
    const stripHeader = (s: string): string =>
      s.split('\n').slice(8).join('\n');
    expect(stripHeader(tamperedOut)).toBe(stripHeader(original));
  });

  it('handles a v1 replay (no blockQueue) by falling back to RNG', () => {
    const { recordedInputs, finalState } = recordFixedScript('v1-seed');
    const v2 = createReplayData(recordedInputs, finalState);
    const v1: ReplayData = {
      id: v2.id,
      seed: v2.seed,
      inputs: v2.inputs,
      gameConfig: v2.gameConfig,
      metadata: v2.metadata,
    };

    const md = replayToNotation(v1, { source: 'legacy.json' });
    expect(md).toContain('- schema version: 1');
    expect(md).toMatch(/#01\s+f=/);
  });
});

describe('replayToNotation — Phase 2 annotations', () => {
  it('appends PSP and color-balance annotations to drop lines', () => {
    const { recordedInputs, finalState } = recordFixedScript('annot-seed');
    const replay = createReplayData(recordedInputs, finalState);

    const md = replayToNotation(replay, { source: 'a.json' });

    expect(md).toMatch(/#\d+\s.*\/\/\s+PSP\s+[▲▼=]/);
    expect(md).toMatch(/bal=[LD0]/);
  });

  it('appends yield/ratio annotation to sweep payout lines', () => {
    const { recordedInputs, finalState } = recordFixedScript('sweep-seed');
    const replay = createReplayData(recordedInputs, finalState);

    const md = replayToNotation(replay, { source: 's.json' });
    if (md.includes('>>> SWEEP')) {
      expect(md).toMatch(
        />>>\s+SWEEP[^\n]*\/\/\s+yield=\d+\s+drops=\d+\s+ratio=/
      );
    }
  });

  it('emits a Summary block with heatmap, balance, dead cells, and sweep yield', () => {
    const { recordedInputs, finalState } = recordFixedScript('summary-seed');
    const replay = createReplayData(recordedInputs, finalState);

    const md = replayToNotation(replay, { source: 'sum.json' });
    expect(md).toContain('## Summary');
    expect(md).toContain('column placement heatmap:');
    expect(md).toContain('color balance: light=');
    expect(md).toContain('dead cells (final): ');
    expect(md).toContain('sweep payouts: ');
  });
});
