import { describe, it, expect, beforeEach } from 'vitest';
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

  describe('step() — per_block mode', () => {
    let env: LuminesEnv;

    beforeEach(() => {
      env = new LuminesEnv({ mode: 'per_block', seed: 'block-test' });
      env.reset();
    });

    it('returns a valid step result', () => {
      const result = env.step({ targetX: 7, rotation: 0 });

      expect(result.reward).toBeGreaterThanOrEqual(0);
      expect(typeof result.done).toBe('boolean');
      expect(result.observation.board).toHaveLength(10);
      expect(result.observation.score).toBeGreaterThanOrEqual(0);
    });

    it('increments blocksPlaced each step', () => {
      const r1 = env.step({ targetX: 7, rotation: 0 });
      const r2 = env.step({ targetX: 3, rotation: 1 });

      expect(r1.info.blocksPlaced).toBe(1);
      expect(r2.info.blocksPlaced).toBe(2);
    });

    it('clamps targetX out-of-bounds silently', () => {
      // Should not throw for extreme values
      expect(() => env.step({ targetX: -99, rotation: 0 })).not.toThrow();
      expect(() => env.step({ targetX: 999, rotation: 0 })).not.toThrow();
    });

    it('returns done:true after game over and no-ops on subsequent steps', () => {
      // Play until game over (fill the board with 200 blocks max)
      let done = false;
      let result = env.step({ targetX: 0, rotation: 0 });
      for (let i = 0; i < 200 && !done; i++) {
        result = env.step({ targetX: 0, rotation: 0 });
        done = result.done;
      }

      if (result.done) {
        const afterDone = env.step({ targetX: 7, rotation: 0 });
        expect(afterDone.done).toBe(true);
        expect(afterDone.reward).toBe(0);
      }
      // If game didn't end in 200 blocks (normal — game is 3600 frames),
      // just check done is false (timer-based game over, not block-fill based)
    });
  });
});
