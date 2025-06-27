import { describe, it, expect } from 'vitest';

import type { CellValue } from '@/types/game';

import { rotateBlockPattern } from '../../gameLogic';

describe('Block Rotation', () => {
  it('should rotate 2x2 pattern clockwise', () => {
    const pattern: CellValue[][] = [
      [1, 2],
      [0, 1],
    ];

    const rotated = rotateBlockPattern(pattern, true);
    const expected: CellValue[][] = [
      [0, 1],
      [1, 2],
    ];

    expect(rotated).toEqual(expected);
  });

  it('should rotate 2x2 pattern counter-clockwise', () => {
    const pattern: CellValue[][] = [
      [1, 2],
      [0, 1],
    ];

    const rotated = rotateBlockPattern(pattern, false);
    const expected: CellValue[][] = [
      [2, 1],
      [1, 0],
    ];

    expect(rotated).toEqual(expected);
  });
});
