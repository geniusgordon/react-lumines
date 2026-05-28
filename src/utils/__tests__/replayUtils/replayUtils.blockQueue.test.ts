import { describe, it, expect } from 'vitest';

import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import {
  createReplayData,
  expandReplayDataWithSnapshots,
  getReplayBlockQueue,
} from '@/utils/replayUtils';

describe('replayUtils - block queue (v2 schema)', () => {
  describe('getReplayBlockQueue', () => {
    it('returns null for v1 replay', () => {
      const v1: ReplayData = {
        id: 'r1',
        seed: 'seed1',
        inputs: [],
        gameConfig: { version: '1.0.0', timestamp: 0 },
        metadata: { finalScore: 0 },
      };
      expect(getReplayBlockQueue(v1)).toBeNull();
    });

    it('returns null for v2 replay missing blockQueue field', () => {
      const malformed: ReplayData = {
        id: 'r1',
        version: 2,
        seed: 'seed1',
        inputs: [],
        gameConfig: { version: '1.0.0', timestamp: 0 },
        metadata: { finalScore: 0 },
      };
      expect(getReplayBlockQueue(malformed)).toBeNull();
    });

    it('returns blockQueue for v2 replay', () => {
      const v2: ReplayData = {
        id: 'r1',
        version: 2,
        seed: 'seed1',
        blockQueue: [3, 7, 1, 15],
        inputs: [],
        gameConfig: { version: '1.0.0', timestamp: 0 },
        metadata: { finalScore: 0 },
      };
      expect(getReplayBlockQueue(v2)).toEqual([3, 7, 1, 15]);
    });
  });

  describe('initial state honours recordedBlockQueue', () => {
    it('uses queue entries instead of RNG for initial 4 blocks', () => {
      const queue = [3, 7, 1, 15];
      const state = createInitialGameState('any-seed', false, 'normal', queue);

      expect(state.currentBlock.patternIndex).toBe(3);
      expect(state.queue.map(b => b.patternIndex)).toEqual([7, 1, 15]);
      expect(state.spawnedBlocks).toEqual([3, 7, 1, 15]);
      expect(state.recordedBlockQueue).toEqual(queue);
    });

    it('falls back to RNG when no queue provided', () => {
      const state = createInitialGameState('seed-X');
      expect(state.spawnedBlocks).toHaveLength(4);
      expect(state.recordedBlockQueue).toBeNull();
    });

    it('produces identical spawn sequence for same seed (determinism)', () => {
      const a = createInitialGameState('determ');
      const b = createInitialGameState('determ');
      expect(a.spawnedBlocks).toEqual(b.spawnedBlocks);
    });
  });

  describe('round-trip: live game → v2 replay → resim matches', () => {
    function playFixedScript(state: GameState): GameState {
      // Start game + skip countdown + place 5 blocks via hard drop.
      let s = gameReducer(state, { type: 'START_GAME' });
      s = gameReducer(s, { type: 'SKIP_COUNTDOWN' });
      for (let i = 0; i < 5; i++) {
        s = gameReducer(s, { type: 'HARD_DROP' });
        for (let f = 0; f < 5; f++) {
          s = gameReducer(s, { type: 'TICK' });
        }
      }
      return s;
    }

    it('exported v2 replay carries the spawnedBlocks history', () => {
      const initial = createInitialGameState('round-trip-seed');
      const final = playFixedScript(initial);

      const replay = createReplayData([], final);

      expect(replay.version).toBe(2);
      expect(replay.blockQueue).toEqual(final.spawnedBlocks);
      // 4 initial + 5 placements = 9 spawn events
      expect(replay.blockQueue?.length).toBeGreaterThanOrEqual(9);
    });

    it('resim with recordedBlockQueue reproduces the same spawn sequence', () => {
      const initial = createInitialGameState('round-trip-seed');
      const final = playFixedScript(initial);

      // Build a v2 replay with that block queue
      const v2: ReplayData = {
        id: 'round-trip',
        version: 2,
        seed: 'round-trip-seed',
        blockQueue: final.spawnedBlocks,
        inputs: [],
        gameConfig: { version: '1.0.0', timestamp: 0 },
        metadata: { finalScore: final.score },
      };

      // Replay it from a different seed — block patterns should still match
      // because they come from blockQueue, not RNG.
      const replayInitial = createInitialGameState(
        'a-totally-different-seed',
        false,
        'normal',
        getReplayBlockQueue(v2)
      );
      const replayed = playFixedScript(replayInitial);

      expect(replayed.spawnedBlocks).toEqual(final.spawnedBlocks);
    });

    it('expandReplayDataWithSnapshots passes blockQueue to resim', () => {
      const initial = createInitialGameState('expand-seed');
      const final = playFixedScript(initial);
      const replay = createReplayData([], final);

      // Should not throw and should produce snapshots.
      const expanded = expandReplayDataWithSnapshots(replay);
      expect(expanded.snapshots.length).toBeGreaterThan(0);
    });
  });
});
