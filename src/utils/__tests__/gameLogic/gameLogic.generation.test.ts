import { describe, it, expect } from 'vitest';

import { generateRandomBlock } from '../../gameLogic';
import { SeededRNG } from '../../seededRNG';

describe('Random Block Generation', () => {
  it('should generate deterministic blocks', () => {
    const rng1 = new SeededRNG('12345');
    const rng2 = new SeededRNG('12345');

    const block1 = generateRandomBlock(rng1);
    const block2 = generateRandomBlock(rng2);

    expect(block1.pattern).toEqual(block2.pattern);
    expect(block1.id).toBe(block2.id);
  });

  it('should generate valid blocks', () => {
    const rng = new SeededRNG('12345');

    for (let i = 0; i < 50; i++) {
      const block = generateRandomBlock(rng);

      expect(block.pattern).toHaveLength(2);
      expect(block.pattern[0]).toHaveLength(2);
      expect(block.rotation).toBe(0);
      expect(block.id).toHaveLength(8);

      // Pattern should contain valid cell values
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          expect([1, 2]).toContain(block.pattern[y][x]);
        }
      }
    }
  });
});
