import { Block, Column, RotateDirection } from '../types';

export function rotate(block: Block, direction: RotateDirection): Block {
  if (direction === RotateDirection.CW) {
    return [[block[0][1], block[1][1]], [block[0][0], block[1][0]]];
  }
  return [[block[1][0], block[0][0]], [block[1][1], block[0][1]]];
}

export function addToColumn(block: Column, column: Column): Column {
  const result = [...column];

  let i = column.length - 1;
  while (i >= 0) {
    if (column[i] === null) {
      break;
    }
    i--;
  }
  let j = block.length - 1;
  while (i >= 0 && j >= 0) {
    result[i] = block[j];
    i--;
    j--;
  }

  return result;
}
