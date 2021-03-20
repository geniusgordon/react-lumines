import { addToColumn } from '../grid';
import { Color, Cell, Column } from '../types';

function createCellByColor(color: Color): Cell {
  return {
    color,
    matched: false,
    scanned: false,
  };
}

function createColumByColors(colors: Array<Color | null>): Column {
  return colors.map(color =>
    color === null ? null : createCellByColor(color),
  );
}

test.each([
  [
    'column empty',
    [Color.LIGHT, Color.DARK],
    createColumByColors([null, null, null, null, null]),
    createColumByColors([null, null, null, Color.LIGHT, Color.DARK]),
  ],
  [
    'column not empty',
    [Color.LIGHT, Color.DARK],
    createColumByColors([null, null, null, null, Color.DARK]),
    createColumByColors([null, null, Color.LIGHT, Color.DARK, Color.DARK]),
  ],
  [
    'column nearly full',
    [Color.LIGHT, Color.DARK],
    createColumByColors([null, Color.DARK]),
    createColumByColors([Color.DARK, Color.DARK]),
  ],
])('add blocks to column, %s', (_, colors, column, output) => {
  const result = addToColumn(colors, column);
  expect(result).toEqual(output);
});
