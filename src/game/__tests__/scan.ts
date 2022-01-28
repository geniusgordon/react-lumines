import { scanColumn, removeScanned } from '../grid';
import { Color } from '../types';
import { createGridWithCells } from '../test-helpers';
import { Dimension, Speed } from '../../constants';

test.each([
  [
    'scan',
    createGridWithCells(2, 4, [
      [0, 1, Color.DARK],
      [0, 2, Color.LIGHT, { col: 0, row: 2 }],
      [0, 3, Color.LIGHT, { col: 0, row: 2 }],
      [1, 1, Color.DARK],
      [1, 2, Color.LIGHT, { col: 0, row: 2 }],
      [1, 3, Color.LIGHT, { col: 0, row: 2 }],
    ]),
    0,
    {
      grid: createGridWithCells(2, 4, [
        [0, 1, Color.DARK],
        [0, 2, Color.LIGHT, { col: 0, row: 2 }, true],
        [0, 3, Color.LIGHT, { col: 0, row: 2 }, true],
        [1, 1, Color.DARK],
        [1, 2, Color.LIGHT, { col: 0, row: 2 }],
        [1, 3, Color.LIGHT, { col: 0, row: 2 }],
      ]),
      matchedCount: 1,
      scannedCount: 2,
    },
  ],
])('scanColumn, %s', (_, grid, column, output) => {
  const result = scanColumn(grid, column);
  expect(result).toEqual(output);
});

test.each([
  [
    'remove',
    createGridWithCells(2, 6, [
      [0, 1, Color.DARK],
      [0, 2, Color.LIGHT],
      [0, 3, Color.LIGHT, { col: 0, row: 3 }, true],
      [0, 4, Color.LIGHT, { col: 0, row: 3 }, true],
      [0, 5, Color.DARK],
      [1, 1, Color.LIGHT],
      [1, 2, Color.DARK],
      [1, 3, Color.LIGHT, { col: 0, row: 3 }, true],
      [1, 4, Color.LIGHT, { col: 0, row: 3 }, true],
      [1, 5, Color.DARK],
    ]),
    {
      grid: createGridWithCells(2, 6, [
        [0, 5, Color.DARK],
        [1, 5, Color.DARK],
      ]),
      detachedBlocks: [
        {
          color: Color.LIGHT,
          x: 0,
          y: 2 * Dimension.SQUARE_SIZE,
          speed: {
            x: 0,
            y: Speed.DROP_DETACHED,
          },
        },
        {
          color: Color.DARK,
          x: 0,
          y: Dimension.SQUARE_SIZE,
          speed: {
            x: 0,
            y: Speed.DROP_DETACHED,
          },
        },
        {
          color: Color.DARK,
          x: Dimension.SQUARE_SIZE,
          y: 2 * Dimension.SQUARE_SIZE,
          speed: {
            x: 0,
            y: Speed.DROP_DETACHED,
          },
        },
        {
          color: Color.LIGHT,
          x: Dimension.SQUARE_SIZE,
          y: Dimension.SQUARE_SIZE,
          speed: {
            x: 0,
            y: Speed.DROP_DETACHED,
          },
        },
      ],
    },
  ],
])('removeScanned, %s', (_, input, output) => {
  const result = removeScanned(input);
  expect(result).toEqual(output);
});
