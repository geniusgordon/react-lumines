import randomSeed from 'random-seed';

type RandomFunction = ReturnType<typeof randomSeed.create>;

/**
 * Seeded Random Number Generator for deterministic gameplay
 * Uses the random-seed package for reliable, well-tested random generation
 */
export class SeededRNG {
  private rng: RandomFunction;
  private readonly seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.rng = randomSeed.create(seed.toString());
  }

  /**
   * Generate next random number (0 to 1, exclusive)
   * Returns same sequence for same seed - crucial for deterministic gameplay
   */
  next(): number {
    return this.rng.random();
  }

  /**
   * Generate random integer from 0 to max-1 (inclusive)
   * @param max - Maximum value (exclusive)
   */
  nextInt(max: number): number {
    if (max <= 0) {
      throw new Error('Max value must be positive');
    }
    return Math.floor(this.next() * max);
  }

  /**
   * Generate random float between 0 and 1
   */
  nextFloat(): number {
    return this.next();
  }

  /**
   * Generate random float between min and max
   */
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generate random boolean with optional probability
   * @param probability - Chance of returning true (0-1)
   */
  nextBoolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Choose random element from array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.nextInt(array.length)];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Reset RNG to initial seed or new seed
   */
  reset(newSeed?: number): void {
    const seedToUse = newSeed ?? this.seed;
    this.rng = randomSeed.create(seedToUse.toString());
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Get current internal state (for serialization)
   * Note: random-seed doesn't expose internal state, so we return the seed
   */
  getState(): number {
    return this.seed;
  }

  /**
   * Set internal state (for deserialization)
   * Note: random-seed doesn't allow state setting, so we reset with new seed
   */
  setState(state: number): void {
    this.rng = randomSeed.create(state.toString());
  }

  /**
   * Create a copy of this RNG with same seed
   */
  clone(): SeededRNG {
    return new SeededRNG(this.seed);
  }

  /**
   * Generate deterministic UUID-like string
   * Useful for block IDs that need to be deterministic
   */
  generateId(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars[this.nextInt(16)];
    }
    return result;
  }
}

/**
 * Create a new SeededRNG instance
 */
export function createSeededRNG(seed?: number): SeededRNG {
  return new SeededRNG(seed);
}

/**
 * Validate that two RNG instances produce same sequence
 * Useful for testing deterministic behavior
 */
export function validateDeterminism(seed: number, iterations: number = 1000): boolean {
  const rng1 = new SeededRNG(seed);
  const rng2 = new SeededRNG(seed);

  for (let i = 0; i < iterations; i++) {
    if (rng1.next() !== rng2.next()) {
      return false;
    }
  }

  return true;
}

/**
 * Test RNG distribution quality
 * Returns true if distribution appears uniform
 */
export function testDistribution(seed: number, buckets: number = 10, samples: number = 10000): boolean {
  const rng = new SeededRNG(seed);
  const counts = new Array(buckets).fill(0);
  
  for (let i = 0; i < samples; i++) {
    const bucket = Math.floor(rng.next() * buckets);
    counts[bucket]++;
  }

  // Check if distribution is reasonably uniform
  const expected = samples / buckets;
  const tolerance = expected * 0.1; // 10% tolerance
  
  return counts.every(count => Math.abs(count - expected) <= tolerance);
} 