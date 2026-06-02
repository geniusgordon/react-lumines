import { describe, expect, it } from 'vitest';

import { createInitialGameState, gameReducer } from '@/reducers/gameReducer';
import type { GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { driveReplay, replayTotalFrames } from '@/utils/replaySimulation';
import { createReplayData, expandReplayData } from '@/utils/replayUtils';

// Build a real short replay by recording a scripted game through the reducer.
function recordGame(actions: GameAction[]): ReplayData {
  let s: GameState = createInitialGameState('seed-xyz', false, 'normal', null);
  s = gameReducer(s, { type: 'START_GAME' });
  s = gameReducer(s, { type: 'SKIP_COUNTDOWN' });
  const inputs = [] as { type: string; frame: number; payload?: unknown }[];
  let frame = 0;
  for (const a of actions) {
    if (a.type === 'TICK') {
      s = gameReducer(s, a);
      frame += 1;
    } else {
      inputs.push({
        type: a.type,
        frame,
        payload: (a as { payload?: unknown }).payload,
      });
      s = gameReducer(s, a);
    }
  }
  return createReplayData(inputs as ReplayData['inputs'], s);
}

describe('replayTotalFrames', () => {
  it('uses duration when present', () => {
    expect(replayTotalFrames(1000, 5)).toBe(60); // 1000ms * 60fps / 1000
  });
  it('falls back to frame count when duration missing', () => {
    expect(replayTotalFrames(undefined, 42)).toBe(42);
  });
});

describe('driveReplay', () => {
  it('reproduces a recorded scripted game and fires hooks', () => {
    const script: GameAction[] = [];
    for (let i = 0; i < 4; i++) {
      script.push({ type: 'HARD_DROP' });
      for (let t = 0; t < 30; t++) {
        script.push({ type: 'TICK' });
      }
    }
    const replay = recordGame(script);
    const frameActions = expandReplayData(replay);
    const totalFrames = replayTotalFrames(
      replay.metadata.duration,
      frameActions.length
    );

    let drops = 0;
    let started = false;
    const final = driveReplay(replay.seed, frameActions, totalFrames, null, {
      onStart: () => {
        started = true;
      },
      onHardDrop: () => {
        drops += 1;
      },
    });

    expect(started).toBe(true);
    expect(drops).toBe(4);
    expect(final.score).toBe(replay.metadata.finalScore);
  });
});
