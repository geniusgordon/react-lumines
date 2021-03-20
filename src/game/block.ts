import { Block, RotateDirection } from './types';

export function rotate(block: Block, direction: RotateDirection): Block {
  if (direction === RotateDirection.CW) {
    return [
      [block[0][1], block[1][1]],
      [block[0][0], block[1][0]],
    ];
  }
  return [
    [block[1][0], block[0][0]],
    [block[1][1], block[0][1]],
  ];
}
