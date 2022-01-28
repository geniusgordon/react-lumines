import { isFree } from './grid';
import {
  Color,
  Block,
  Grid,
  RotateDirection,
  ActiveBlock,
  DetachedBlock,
  MovingObject,
  ScanLine,
} from './types';
import { Dimension, Speed } from '../constants';

export function getRandomBlock(): Block {
  const n = Math.floor(Math.random() * 16);
  return [
    [n & 8 ? Color.LIGHT : Color.DARK, n & 4 ? Color.LIGHT : Color.DARK],
    [n & 2 ? Color.LIGHT : Color.DARK, n & 1 ? Color.LIGHT : Color.DARK],
  ];
}

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

export function decompose(block: ActiveBlock): DetachedBlock[] {
  const result: DetachedBlock[] = [];
  block.block.forEach((col, i) => {
    col.reverse().forEach((c, j) => {
      result.push({
        color: c,
        x: block.x + Dimension.SQUARE_SIZE * i,
        y: block.y + Dimension.SQUARE_SIZE * (col.length - j - 1),
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
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

export function nextBlockY(block: MovingObject, elapsed: number): number {
  return block.y + Math.min(elapsed * block.speed.y, Dimension.SQUARE_SIZE);
}

export function nextScanLineX(scanLine: ScanLine, elapsed: number): number {
  return (
    (scanLine.x + Math.min(elapsed * scanLine.speed.x, Dimension.SQUARE_SIZE)) %
    Dimension.GRID_WIDTH
  );
}
