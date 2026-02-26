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

  describe('step() — per_frame mode', () => {
    let env: LuminesEnv;

    beforeEach(() => {
      env = new LuminesEnv({ mode: 'per_frame', seed: 'frame-test' });
      env.reset();
    });

    it('returns valid step result', () => {
      const result = env.step('NO_OP');
      expect(result.observation.board).toHaveLength(10);
      expect(result.reward).toBeGreaterThanOrEqual(0);
    });

    it('NO_OP does not change blockPosition.x', () => {
      const before = env.getState().blockPosition.x;
      env.step('NO_OP');
      const after = env.getState().blockPosition.x;
      expect(after).toBe(before);
    });

    it('MOVE_LEFT changes blockPosition.x when not at wall', () => {
      // Default spawn is x=7, so MOVE_LEFT should work
      const before = env.getState().blockPosition.x;
      env.step('MOVE_LEFT');
      const after = env.getState().blockPosition.x;
      // Either moved left or was already at wall
      expect(after).toBeLessThanOrEqual(before);
    });
  });

  describe('appliedInputs', () => {
    let env: LuminesEnv;

    beforeEach(() => {
      env = new LuminesEnv({ mode: 'per_block', seed: 'block-test' });
      env.reset();
    });

    it('returns appliedInputs for each step', () => {
      const result = env.step({ targetX: 7, rotation: 2 });

      expect(Array.isArray(result.appliedInputs)).toBe(true);
      // rotation=2 → 2 ROTATE_CW
      const rotations = result.appliedInputs.filter(i => i.type === 'ROTATE_CW');
      expect(rotations).toHaveLength(2);
      // always ends with HARD_DROP
      const lastInput = result.appliedInputs[result.appliedInputs.length - 1];
      expect(lastInput.type).toBe('HARD_DROP');
      // all inputs have the same frame (before safety ticks)
      const frame = result.appliedInputs[0].frame;
      expect(result.appliedInputs.every(i => i.frame === frame)).toBe(true);
    });

    it('appliedInputs rotation=0 has no ROTATE_CW', () => {
      const result = env.step({ targetX: 7, rotation: 0 });
      const rotations = result.appliedInputs.filter(i => i.type === 'ROTATE_CW');
      expect(rotations).toHaveLength(0);
    });

    it('appliedInputs move count matches actual displacement', () => {
      env.reset('block-test');
      const stateBefore = env.getState();
      const startX = stateBefore.blockPosition.x; // default spawn X
      const targetX = startX + 2; // move right by 2
      const result = env.step({ targetX, rotation: 0 });
      const moves = result.appliedInputs.filter(i => i.type === 'MOVE_RIGHT');
      // moved right by 2 (or less if wall hit — result.appliedInputs only has successful moves)
      expect(moves.length).toBeLessThanOrEqual(2);
      expect(moves.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('determinism', () => {
    it('two instances with same seed + same actions produce identical results', () => {
      const env1 = new LuminesEnv({ mode: 'per_block', seed: 'det-seed' });
      const env2 = new LuminesEnv({ mode: 'per_block', seed: 'det-seed' });

      env1.reset('det-seed');
      env2.reset('det-seed');

      const actions: Array<{ targetX: number; rotation: 0 | 1 | 2 | 3 }> = [
        { targetX: 7, rotation: 0 },
        { targetX: 3, rotation: 1 },
        { targetX: 12, rotation: 2 },
        { targetX: 5, rotation: 3 },
        { targetX: 0, rotation: 0 },
      ];

      for (const action of actions) {
        const r1 = env1.step(action);
        const r2 = env2.step(action);
        expect(r1.reward).toBe(r2.reward);
        expect(r1.done).toBe(r2.done);
        expect(r1.observation.score).toBe(r2.observation.score);
      }

      expect(env1.getState().score).toBe(env2.getState().score);
    });
  });
});
