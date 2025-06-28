import { describe, it, expect } from 'vitest';

import type { ReplayData } from '@/types/replay';
import { expandReplayData } from '@/utils/replayUtils';

describe('replayUtils - expansion', () => {
  describe('expandReplayData', () => {
    it('should expand empty replay data', () => {
      const replayData: ReplayData = {
        seed: 'test-seed',
        inputs: [],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = expandReplayData(replayData);
      expect(result).toHaveLength(1); // Frame 0 always exists
      expect(result[0]).toEqual({
        frame: 0,
        userActions: [],
      });
    });

    it('should expand replay data with single action', () => {
      const replayData: ReplayData = {
        seed: 'test-seed',
        inputs: [{ type: 'MOVE_LEFT', frame: 2 }],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = expandReplayData(replayData);
      expect(result).toHaveLength(3); // Frames 0, 1, 2

      expect(result[0]).toEqual({
        frame: 0,
        userActions: [],
      });

      expect(result[1]).toEqual({
        frame: 1,
        userActions: [],
      });

      expect(result[2]).toEqual({
        frame: 2,
        userActions: [{ type: 'MOVE_LEFT' }],
      });
    });

    it('should expand replay data with multiple actions per frame', () => {
      const replayData: ReplayData = {
        seed: 'test-seed',
        inputs: [
          { type: 'MOVE_LEFT', frame: 1 },
          { type: 'ROTATE_CW', frame: 1, payload: 'test' },
          { type: 'HARD_DROP', frame: 3 },
        ],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = expandReplayData(replayData);
      expect(result).toHaveLength(4); // Frames 0, 1, 2, 3

      expect(result[0]).toEqual({
        frame: 0,
        userActions: [],
      });

      expect(result[1]).toEqual({
        frame: 1,
        userActions: [
          { type: 'MOVE_LEFT' },
          { type: 'ROTATE_CW', payload: 'test' },
        ],
      });

      expect(result[2]).toEqual({
        frame: 2,
        userActions: [],
      });

      expect(result[3]).toEqual({
        frame: 3,
        userActions: [{ type: 'HARD_DROP' }],
      });
    });

    it('should preserve action payloads', () => {
      const replayData: ReplayData = {
        seed: 'test-seed',
        inputs: [{ type: 'SOFT_DROP', frame: 0, payload: { speed: 2 } }],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = expandReplayData(replayData);
      expect(result[0].userActions[0]).toEqual({
        type: 'SOFT_DROP',
        payload: { speed: 2 },
      });
    });
  });
});
