import { describe, it, expect } from 'vitest';

import type { ReplayInput } from '@/types/replay';
import {
  validateReplayData,
  expandReplayData,
  createReplayData,
} from '../../replayUtils';

describe('replayUtils - integration', () => {
  describe('integration tests', () => {
    it('should roundtrip: compact -> expand -> validate', () => {
      // Start with recorded inputs (as they would come from useReplayRecorder)
      const recordedInputs: ReplayInput[] = [
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'TICK', frame: 0 },
        { type: 'ROTATE_CW', frame: 0, payload: 'test' },
        { type: 'TICK', frame: 0 },
        { type: 'HARD_DROP', frame: 0 },
        { type: 'TICK', frame: 0 },
      ];

      // Create replay data (compaction)
      const replayData = createReplayData(recordedInputs, 'integration-seed');

      // Validate the replay data
      const validation = validateReplayData(replayData);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Expand the replay data
      const frameActions = expandReplayData(replayData);

      // Verify the expansion matches expected structure
      expect(frameActions).toHaveLength(3); // Frames 0, 1, 2
      expect(frameActions[0]).toEqual({
        frame: 0,
        userActions: [{ type: 'MOVE_LEFT' }],
        hasTick: true,
      });
      expect(frameActions[1]).toEqual({
        frame: 1,
        userActions: [{ type: 'ROTATE_CW', payload: 'test' }],
        hasTick: true,
      });
      expect(frameActions[2]).toEqual({
        frame: 2,
        userActions: [{ type: 'HARD_DROP' }],
        hasTick: true,
      });
    });

    it('should handle complex replay scenario', () => {
      const recordedInputs: ReplayInput[] = [
        // Frame 0: Multiple actions
        { type: 'MOVE_LEFT', frame: 0 },
        { type: 'ROTATE_CW', frame: 0 },
        { type: 'TICK', frame: 0 },
        // Frame 1: No actions
        { type: 'TICK', frame: 0 },
        // Frame 2: Single action
        { type: 'HARD_DROP', frame: 0 },
        { type: 'TICK', frame: 0 },
        // Frame 3: Action with payload
        { type: 'SOFT_DROP', frame: 0, payload: { speed: 3 } },
        { type: 'TICK', frame: 0 },
      ];

      const replayData = createReplayData(recordedInputs, 'complex-seed');
      const validation = validateReplayData(replayData);
      const frameActions = expandReplayData(replayData);

      expect(validation.valid).toBe(true);
      expect(frameActions).toHaveLength(4);

      expect(frameActions[0].userActions).toHaveLength(2);
      expect(frameActions[1].userActions).toHaveLength(0);
      expect(frameActions[2].userActions).toHaveLength(1);
      expect(frameActions[3].userActions).toHaveLength(1);
      expect(frameActions[3].userActions[0].payload).toEqual({ speed: 3 });
    });
  });
});