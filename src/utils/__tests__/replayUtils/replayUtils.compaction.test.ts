import { describe, it, expect } from 'vitest';

import type { ReplayInput } from '@/types/replay';
import { compactReplayInputs } from '@/utils/replayUtils';

describe('replayUtils - compaction', () => {
  describe('compactReplayInputs', () => {
    it('should compact empty input array', () => {
      const result = compactReplayInputs([]);
      expect(result).toEqual([]);
    });

    it('should remove TICK actions and calculate frame numbers', () => {
      const recordedInputs: ReplayInput[] = [
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'TICK', frame: 0 },
        { type: 'TICK', frame: 0 },
        { type: 'ROTATE_CW', frame: 0, payload: 'test' },
        { type: 'TICK', frame: 0 },
        { type: 'HARD_DROP', frame: 0 },
        { type: 'TICK', frame: 0 },
      ];

      const result = compactReplayInputs(recordedInputs);
      expect(result).toEqual([
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'ROTATE_CW', frame: 2, payload: 'test' },
        { type: 'HARD_DROP', frame: 3 },
      ]);
    });

    it('should handle multiple user actions before first TICK', () => {
      const recordedInputs: ReplayInput[] = [
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'ROTATE_CW', frame: 0 },
        { type: 'TICK', frame: 0 },
        { type: 'HARD_DROP', frame: 0 },
        { type: 'TICK', frame: 0 },
      ];

      const result = compactReplayInputs(recordedInputs);
      expect(result).toEqual([
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'ROTATE_CW', frame: 0 },
        { type: 'HARD_DROP', frame: 1 },
      ]);
    });

    it('should handle only TICK actions', () => {
      const recordedInputs: ReplayInput[] = [
        { type: 'TICK', frame: 0 },
        { type: 'TICK', frame: 0 },
        { type: 'TICK', frame: 0 },
      ];

      const result = compactReplayInputs(recordedInputs);
      expect(result).toEqual([]);
    });

    it('should preserve action payloads during compaction', () => {
      const recordedInputs: ReplayInput[] = [
        { type: 'SOFT_DROP', frame: 0, payload: { speed: 2 } },
        { type: 'TICK', frame: 0 },
        { type: 'MOVE_RIGHT', frame: 0, payload: { distance: 1 } },
      ];

      const result = compactReplayInputs(recordedInputs);
      expect(result).toEqual([
        { type: 'SOFT_DROP', frame: 0, payload: { speed: 2 } },
        { type: 'MOVE_RIGHT', frame: 1, payload: { distance: 1 } },
      ]);
    });
  });
});
