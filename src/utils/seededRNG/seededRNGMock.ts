import type { SeededRNGType } from './type';

export class SeededRNGMock implements SeededRNGType {
  private sequence: number[] = [];
  private index = 0;

  constructor(sequence: number[], index: number = 0) {
    this.sequence = sequence;
    this.index = index;
  }

  next(): number {
    return this.sequence[this.index++ % this.sequence.length];
  }

  nextInt(max: number): number {
    return this.next() % max;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(array.length)];
  }

  reset() {
    this.index = 0;
  }

  getSeed(): string {
    return this.sequence.join(',');
  }

  getState(): number {
    return this.index;
  }

  setState(index: number): void {
    this.index = index;
  }

  clone(): SeededRNGType {
    return new SeededRNGMock(this.sequence);
  }

  generateId(): string {
    return this.next().toString();
  }
}
