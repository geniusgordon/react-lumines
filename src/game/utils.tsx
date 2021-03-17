import { Block, RotateDirection } from '../types';

export function rotate(block: Block, direction: RotateDirection): Block {
  // 00 10
  // 01 11
  if (direction === RotateDirection.CW) {
    // 01 00
    // 11 10
    return [[block[0][1], block[1][1]], [block[0][0], block[1][0]]];
  }
  // 10 11
  // 00 01
  return [[block[1][0], block[0][0]], [block[1][1], block[0][1]]];
}
