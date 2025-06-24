export interface SeededRNGType {
  next(): number;
  nextInt(max: number): number;
  choice<T>(array: T[]): T;
  reset(seed?: string): void;
  getSeed(): string;
  getState(): number;
  setState(index: number): void;
  clone(): SeededRNGType;
  generateId(): string;
}
