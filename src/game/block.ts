import { isFree } from './grid';
import {
  Block,
  Grid,
  RotateDirection,
  ActiveBlock,
  DetachedBlock,
  ScanLine,
} from './types';
import { Dimension, Speed } from '../constants';

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
        speed: Speed.DROP_DETACHED,
      });
    });
  });
  return result;
}

export function move(
  block: ActiveBlock,
  distance: number,
  grid: Grid,
): ActiveBlock {
  const x = block.x + distance;
  if (x < 0 || x > Dimension.GRID_WIDTH) {
    return block;
  }
  if (
    isFree(grid, { x, y: block.y + Dimension.SQUARE_SIZE }) &&
    isFree(grid, {
      x: x + Dimension.SQUARE_SIZE,
      y: block.y + Dimension.SQUARE_SIZE,
    })
  ) {
    return {
      ...block,
      x,
    };
  }
  return block;
}

export function nextBlockY(block: ActiveBlock, time: number): number {
  return block.y + Math.min(time * block.speed, Dimension.SQUARE_SIZE);
}

export function nextScanLineX(scanLine: ScanLine, time: number): number {
  return scanLine.x + time * scanLine.speed;
}
