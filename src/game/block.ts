import { Block, RotateDirection, ActiveBlock, DetachedBlock } from './types';
import { Dimension } from '../constants';

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

export function decompse(block: ActiveBlock): DetachedBlock[] {
  const result: DetachedBlock[] = [];
  block.block.forEach((col, i) => {
    col.reverse().forEach((c, j) => {
      result.push({
        color: c,
        x: block.x + Dimension.SQUARE_SIZE * i,
        y: block.y + Dimension.SQUARE_SIZE * (col.length - j - 1),
      });
    });
  });
  return result;
}
