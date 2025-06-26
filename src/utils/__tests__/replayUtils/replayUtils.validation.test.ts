import { describe, it, expect } from 'vitest';

import type { ReplayData } from '@/types/replay';
import { validateReplayData } from '../../replayUtils';

describe('replayUtils - validation', () => {
  describe('validateReplayData', () => {
    it('should validate correct replay data', () => {
      const validReplayData: ReplayData = {
        seed: 'test-seed-123',
        inputs: [
          { type: 'MOVE_LEFT', frame: 0 },
          { type: 'ROTATE_CW', frame: 5, payload: 'test' },
          { type: 'HARD_DROP', frame: 10 },
        ],
        gameConfig: {
          version: '1.0.0',
          timestamp: Date.now(),
        },
      };

      const result = validateReplayData(validReplayData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or undefined replay data', () => {
      const result1 = validateReplayData(null as any);
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Invalid replay data structure');

      const result2 = validateReplayData(undefined as any);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Invalid replay data structure');
    });

    it('should reject replay data without seed', () => {
      const invalidReplayData = {
        inputs: [],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      } as any;

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid seed');
    });

    it('should reject replay data with invalid seed type', () => {
      const invalidReplayData = {
        seed: 123,
        inputs: [],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      } as any;

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid seed');
    });

    it('should reject replay data without inputs array', () => {
      const invalidReplayData = {
        seed: 'test-seed',
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      } as any;

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid inputs array');
    });

    it('should reject replay data with non-array inputs', () => {
      const invalidReplayData = {
        seed: 'test-seed',
        inputs: 'not-an-array',
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      } as any;

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid inputs array');
    });

    it('should reject inputs with invalid structure', () => {
      const invalidReplayData: ReplayData = {
        seed: 'test-seed',
        inputs: [
          { type: 'MOVE_LEFT', frame: 0 },
          { type: 'INVALID_ACTION' } as any, // Missing frame
          { frame: 5 } as any, // Missing type
        ],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(error =>
          error.includes('inputs have invalid structure')
        )
      ).toBe(true);
    });

    it('should reject inputs with invalid action types', () => {
      const invalidReplayData: ReplayData = {
        seed: 'test-seed',
        inputs: [
          { type: 'MOVE_LEFT', frame: 0 },
          { type: 'INVALID_ACTION', frame: 1 } as any,
          { type: 'ANOTHER_INVALID', frame: 2 } as any,
        ],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          error =>
            error.includes('Invalid action types') &&
            error.includes('INVALID_ACTION') &&
            error.includes('ANOTHER_INVALID')
        )
      ).toBe(true);
    });

    it('should reject inputs with negative frame numbers', () => {
      const invalidReplayData: ReplayData = {
        seed: 'test-seed',
        inputs: [
          { type: 'MOVE_LEFT', frame: -1 },
          { type: 'ROTATE_CW', frame: 0 },
        ],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(error => error.includes('negative frame -1'))
      ).toBe(true);
    });

    it('should reject inputs with non-chronological frame ordering', () => {
      const invalidReplayData: ReplayData = {
        seed: 'test-seed',
        inputs: [
          { type: 'MOVE_LEFT', frame: 5 },
          { type: 'ROTATE_CW', frame: 3 }, // Out of order
          { type: 'HARD_DROP', frame: 7 },
        ],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = validateReplayData(invalidReplayData);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(error =>
          error.includes('frame 3 which is before previous frame 5')
        )
      ).toBe(true);
    });

    it('should allow duplicate frame numbers (multiple actions per frame)', () => {
      const validReplayData: ReplayData = {
        seed: 'test-seed',
        inputs: [
          { type: 'MOVE_LEFT', frame: 0 },
          { type: 'ROTATE_CW', frame: 0 }, // Same frame
          { type: 'HARD_DROP', frame: 1 },
        ],
        gameConfig: { version: '1.0.0', timestamp: Date.now() },
      };

      const result = validateReplayData(validReplayData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});