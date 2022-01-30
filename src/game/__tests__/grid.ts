import {
  xyToColRow,
  colRowToXY,
  updateCell,
  updateCellMatchedBlock,
} from '../grid';
import { createGridWithCells } from '../test-helpers';
import { Dimension } from '../../constants';
import { Color } from '../types';

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
    'update',
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
    { color: Color.DARK, col: 0, row: 1 },
    0,
    1,
    createGridWithCells(2, 2, [
      [0, 1, Color.DARK],
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
  ],
  [
    'col out of bound',
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
    { color: Color.DARK, col: 5, row: 0 },
    5,
    0,
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
  ],
  [
    'row out of bound',
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
    { color: Color.DARK, col: 0, row: 5 },
    0,
    5,
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
  ],
])('updateCell, %s', (_, grid, cell, col, row, output) => {
  const result = updateCell(grid, cell, col, row);
  expect(result).toEqual(output);
});

test.each([
  [
    'update',
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
    { col: 1, row: 0 },
    1,
    0,
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT, { col: 1, row: 0 }],
      [1, 1, Color.DARK],
    ]),
  ],
  [
    "don't update null",
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
    { col: 1, row: 0 },
    0,
    0,
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
  ],
  [
    'col out of bound',
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
    { col: 1, row: 0 },
    5,
    0,
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
  ],
  [
    'row out of bound',
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
    { col: 1, row: 0 },
    0,
    5,
    createGridWithCells(2, 2, [
      [1, 0, Color.LIGHT],
      [1, 1, Color.DARK],
    ]),
  ],
])('updateCellMatchedBlock, %s', (_, grid, matchedBlock, col, row, output) => {
  const result = updateCellMatchedBlock(grid, matchedBlock, col, row);
  expect(result).toEqual(output);
});
