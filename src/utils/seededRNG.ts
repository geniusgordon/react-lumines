import randomSeed from 'random-seed';

type RandomFunction = ReturnType<typeof randomSeed.create>;

/**
 * Seeded Random Number Generator for deterministic gameplay
 * Uses the random-seed package for reliable, well-tested random generation
 */
export class SeededRNG {
  private rng: RandomFunction;
  private readonly seed: string;
  private callCount: number = 0; // Track how many times next() has been called

  constructor(seed: string = Date.now().toString()) {
    this.seed = seed;
    this.rng = randomSeed.create(seed);
  }

  /**
   * Generate next random number (0 to 1, exclusive)
   * Returns same sequence for same seed - crucial for deterministic gameplay
   */
  next(): number {
    this.callCount++;
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
   * Choose random element from array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.nextInt(array.length)];
  }

  /**
   * Reset RNG to initial seed or new seed
   */
  reset(newSeed?: string): void {
    const seedToUse = newSeed ?? this.seed;
    this.rng = randomSeed.create(seedToUse);
    this.callCount = 0;
  }

  /**
   * Get current seed
   */
  getSeed(): string {
    return this.seed;
  }

  /**
   * Get current internal state (for serialization)
   * Returns the call count to track position in the sequence
   */
  getState(): number {
    return this.callCount;
  }

  /**
   * Set internal state (for deserialization)
   * Recreates RNG and advances to the specified position
   */
  setState(callCount: number): void {
    this.rng = randomSeed.create(this.seed);
    this.callCount = 0;

    // Advance the RNG to the correct position
    for (let i = 0; i < callCount; i++) {
      this.rng.random();
      this.callCount++;
    }
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
export function createSeededRNG(seed?: string): SeededRNG {
  return new SeededRNG(seed);
}

/**
 * Validate that two RNG instances produce same sequence
 * Useful for testing deterministic behavior
 */
export function validateDeterminism(
  seed: string,
  iterations: number = 1000
): boolean {
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
export function testDistribution(
  seed: string,
  buckets: number = 10,
  samples: number = 10000
): boolean {
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
