import { xyToColRow, colRowToXY, addToColumn } from '../grid';
import { SQUARE_SIZE } from '../../constants';
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
  [5 * SQUARE_SIZE + 0.5 * SQUARE_SIZE, 5],
  [5 * SQUARE_SIZE - 0.5 * SQUARE_SIZE, 4],
])('xyToColRow', (input, output) => {
  const result = xyToColRow(input);
  expect(result).toEqual(output);
});

test.each([
  [4, 4 * SQUARE_SIZE],
  [5, 5 * SQUARE_SIZE],
])('colRowToXY', (input, output) => {
  const result = colRowToXY(input);
  expect(result).toEqual(output);
});

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
