import { describe, it, expect, beforeEach } from 'vitest';

import {
  SeededRNG,
  createSeededRNG,
  validateDeterminism,
  testDistribution,
} from '../seededRNG';

describe('SeededRNG', () => {
  describe('Deterministic behavior', () => {
    it('should produce identical sequences for same seed', () => {
      const seed = '12345';
      const rng1 = new SeededRNG(seed);
      const rng2 = new SeededRNG(seed);

      // Generate 100 numbers and compare
      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = new SeededRNG('12345');
      const rng2 = new SeededRNG('54321');

      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should reset to initial state', () => {
      const seed = '12345';
      const rng = new SeededRNG(seed);

      const firstSequence = Array.from({ length: 5 }, () => rng.next());
      rng.reset();
      const secondSequence = Array.from({ length: 5 }, () => rng.next());

      expect(firstSequence).toEqual(secondSequence);
    });

    it('should reset to new seed', () => {
      const rng = new SeededRNG('12345');
      const newSeed = '54321';

      rng.reset(newSeed);
      const newRng = new SeededRNG(newSeed);

      // Should produce same sequence as new RNG with new seed
      for (let i = 0; i < 10; i++) {
        expect(rng.next()).toBe(newRng.next());
      }
    });
  });

  describe('Number generation methods', () => {
    let rng: SeededRNG;

    beforeEach(() => {
      rng = new SeededRNG('12345');
    });

    it('should generate numbers between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const num = rng.next();
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(1);
      }
    });

    it('should generate integers in range', () => {
      const max = 10;
      for (let i = 0; i < 100; i++) {
        const num = rng.nextInt(max);
        expect(Number.isInteger(num)).toBe(true);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(max);
      }
    });

    it('should throw error for invalid nextInt max', () => {
      expect(() => rng.nextInt(0)).toThrow('Max value must be positive');
      expect(() => rng.nextInt(-1)).toThrow('Max value must be positive');
    });
  });

  describe('Array methods', () => {
    let rng: SeededRNG;

    beforeEach(() => {
      rng = new SeededRNG('12345');
    });

    it('should choose random element from array', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];

      for (let i = 0; i < 50; i++) {
        const choice = rng.choice(array);
        expect(array).toContain(choice);
      }
    });

    it('should throw error for empty array choice', () => {
      expect(() => rng.choice([])).toThrow('Cannot choose from empty array');
    });
  });

  describe('State management', () => {
    it('should return correct seed', () => {
      const seed = '12345';
      const rng = new SeededRNG(seed);
      expect(rng.getSeed()).toBe(seed);
    });

    it('should clone with same seed', () => {
      const seed = '12345';
      const rng1 = new SeededRNG(seed);
      const rng2 = rng1.clone();

      expect(rng2.getSeed()).toBe(seed);

      // Should produce same sequence
      for (let i = 0; i < 10; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should generate deterministic IDs', () => {
      const rng1 = new SeededRNG('12345');
      const rng2 = new SeededRNG('12345');

      const id1 = rng1.generateId();
      const id2 = rng2.generateId();

      expect(id1).toBe(id2);
      expect(id1).toHaveLength(8);
      expect(id1).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('Utility functions', () => {
    it('should create RNG instance', () => {
      const rng = createSeededRNG('12345');
      expect(rng).toBeInstanceOf(SeededRNG);
      expect(rng.getSeed()).toBe('12345');
    });

    it('should validate determinism', () => {
      expect(validateDeterminism('12345', 100)).toBe(true);
      expect(validateDeterminism('54321', 100)).toBe(true);
    });

    it('should test distribution quality', () => {
      // Test with a good seed
      expect(testDistribution('12345', 10, 10000)).toBe(true);
    });
  });
});
