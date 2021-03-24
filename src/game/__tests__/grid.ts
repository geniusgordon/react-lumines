import {
  xyToColRow,
  colRowToXY,
  addToColumn,
  updateCell,
  updateCellMatchedBlock,
} from '../grid';
import { Dimension } from '../../constants';
import { Color, Column } from '../types';

function createColumByColors(colors: Array<Color | null>): Column {
  return colors.map(color => (color === null ? null : { color }));
}

test.each([
  [5 * Dimension.SQUARE_SIZE + 0.5 * Dimension.SQUARE_SIZE, 5],
  [5 * Dimension.SQUARE_SIZE - 0.5 * Dimension.SQUARE_SIZE, 4],
])('xyToColRow', (input, output) => {
  const result = xyToColRow(input);
  expect(result).toEqual(output);
});

test.each([
  [4, 4 * Dimension.SQUARE_SIZE],
  [5, 5 * Dimension.SQUARE_SIZE],
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

test.each([
  [
    'update',
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
    {
      color: Color.DARK,
    },
    0,
    1,
    [
      [null, { color: Color.DARK }],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
  ],
  [
    'col out of bound',
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
    {
      color: Color.DARK,
    },
    5,
    0,
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
  ],
  [
    'row out of bound',
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
    {
      color: Color.DARK,
    },
    0,
    5,
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
  ],
])('updateCell, %s', (_, grid, cell, col, row, output) => {
  const result = updateCell(grid, cell, col, row);
  expect(result).toEqual(output);
});

test.each([
  [
    'update',
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
    { col: 1, row: 0 },
    1,
    0,
    [
      [null, null],
      [
        { color: Color.LIGHT, matchedBlock: { col: 1, row: 0 } },
        { color: Color.DARK },
      ],
    ],
  ],
  [
    "don't update null",
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
    { col: 1, row: 0 },
    0,
    0,
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
  ],
  [
    'col out of bound',
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
    { col: 1, row: 0 },
    5,
    0,
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
  ],
  [
    'row out of bound',
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
    { col: 1, row: 0 },
    0,
    5,
    [
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.DARK }],
    ],
  ],
])('updateCellMatchedBlock, %s', (_, grid, matchedBlock, col, row, output) => {
  const result = updateCellMatchedBlock(grid, matchedBlock, col, row);
  expect(result).toEqual(output);
});
