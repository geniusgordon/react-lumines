import { describe, it, expect } from 'vitest';
import { LuminesEnv } from '../LuminesEnv';

describe('LuminesEnv', () => {
  describe('reset()', () => {
    it('returns a valid initial observation', () => {
      const env = new LuminesEnv({ seed: 'test-seed' });
      const obs = env.reset();

      expect(obs.board).toHaveLength(10);
      expect(obs.board[0]).toHaveLength(16);
      expect(obs.currentBlock).toHaveLength(2);
      expect(obs.currentBlock[0]).toHaveLength(2);
      expect(obs.queue).toHaveLength(2);
      expect(obs.queue[0]).toHaveLength(2);
      expect(obs.score).toBe(0);
      expect(obs.frame).toBe(0);
      expect(obs.gameTimer).toBe(3600);
      expect(obs.timelineX).toBe(0);
    });

    it('accepts a new seed on reset', () => {
      const env = new LuminesEnv({ seed: 'seed-a' });
      env.reset('seed-a');
      const obs2 = env.reset('seed-b');
      // Different seeds → different first blocks (highly likely)
      // We just check it doesn't throw and returns valid obs
      expect(obs2.score).toBe(0);
      expect(obs2.gameTimer).toBe(3600);
    });
  });
});
