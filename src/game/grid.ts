import { Color, Column } from './types';

export function addToColumn(colors: Color[], column: Column): Column {
  const result = [...column];

  let i = column.length - 1;
  while (i >= 0) {
    if (column[i] === null) {
      break;
    }
    i--;
  }
  let j = colors.length - 1;
  while (i >= 0 && j >= 0) {
    result[i] = {
      color: colors[j],
      matched: false,
      scanned: false,
    };
    i--;
    j--;
  }

  return result;
}
