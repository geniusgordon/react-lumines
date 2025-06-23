import { describe, it, expect } from 'vitest';

import type { Block, CellValue } from '@/types/game';

import { rotateBlockPattern, getRotatedPattern } from '../gameLogic';

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

  it('should get rotated pattern for block', () => {
    const block: Block = {
      pattern: [
        [1, 2],
        [0, 1],
      ] as CellValue[][],
      rotation: 0,
      id: 'test',
    };

    const rotated = getRotatedPattern(block, 1);
    const expected: CellValue[][] = [
      [0, 1],
      [1, 2],
    ];

    expect(rotated).toEqual(expected);
  });
});
