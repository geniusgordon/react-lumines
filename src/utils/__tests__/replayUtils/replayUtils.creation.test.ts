import { describe, it, expect } from 'vitest';

import type { ReplayInput } from '@/types/replay';
import { createReplayData } from '@/utils/replayUtils';

describe('replayUtils - creation', () => {
  describe('createReplayData', () => {
    it('should create replay data with compacted inputs', () => {
      const recordedInputs: ReplayInput[] = [
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'TICK', frame: 0 },
        { type: 'ROTATE_CW', frame: 0 },
        { type: 'TICK', frame: 0 },
      ];

      const seed = 'test-seed-456';
      const result = createReplayData(recordedInputs, {
        seed,
        score: 0,
        frame: 0,
      });

      expect(result.seed).toBe(seed);
      expect(result.inputs).toEqual([
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'ROTATE_CW', frame: 1 },
      ]);
      expect(result.gameConfig.version).toBe('1.0.0');
      expect(result.gameConfig.timestamp).toBeTypeOf('number');
      expect(result.gameConfig.timestamp).toBeGreaterThan(0);
    });

    it('should handle empty recorded inputs', () => {
      const result = createReplayData([], {
        seed: 'empty-seed',
        score: 0,
        frame: 0,
      });

      expect(result.seed).toBe('empty-seed');
      expect(result.inputs).toEqual([]);
      expect(result.gameConfig.version).toBe('1.0.0');
    });

    it('should create unique timestamps', () => {
      const result1 = createReplayData([], {
        seed: 'seed1',
        score: 0,
        frame: 0,
      });
      const result2 = createReplayData([], {
        seed: 'seed2',
        score: 0,
        frame: 0,
      });

      // Timestamps should be close but potentially different
      expect(result2.gameConfig.timestamp).toBeGreaterThanOrEqual(
        result1.gameConfig.timestamp
      );
    });
  });
});
