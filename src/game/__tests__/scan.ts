import { scanColumn, removeScanned } from '../grid';
import { Color } from '../types';
import { Dimension, Speed } from '../../constants';

test.each([
  [
    'scan',
    [
      [
        null,
        { color: Color.DARK },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 } },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 } },
      ],
      [
        null,
        { color: Color.DARK },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 } },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 } },
      ],
    ],
    0,
    {
      grid: [
        [
          null,
          { color: Color.DARK },
          {
            color: Color.LIGHT,
            matchedBlock: { col: 0, row: 2 },
            scanned: true,
          },
          {
            color: Color.LIGHT,
            matchedBlock: { col: 0, row: 2 },
            scanned: true,
          },
        ],
        [
          null,
          { color: Color.DARK },
          { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 } },
          { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 } },
        ],
      ],
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
    [
      [
        null,
        { color: Color.DARK },
        { color: Color.LIGHT },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 }, scanned: true },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 }, scanned: true },
        { color: Color.DARK },
      ],
      [
        null,
        { color: Color.LIGHT },
        { color: Color.DARK },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 }, scanned: true },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 2 }, scanned: true },
        { color: Color.DARK },
      ],
    ],
    {
      grid: [
        [null, null, null, null, null, { color: Color.DARK }],
        [null, null, null, null, null, { color: Color.DARK }],
      ],
      detachedBlocks: [
        {
          color: Color.LIGHT,
          x: 0,
          y: 2 * Dimension.SQUARE_SIZE,
          speed: Speed.DROP_DETACHED,
        },
        {
          color: Color.DARK,
          x: 0,
          y: Dimension.SQUARE_SIZE,
          speed: Speed.DROP_DETACHED,
        },
        {
          color: Color.DARK,
          x: Dimension.SQUARE_SIZE,
          y: 2 * Dimension.SQUARE_SIZE,
          speed: Speed.DROP_DETACHED,
        },
        {
          color: Color.LIGHT,
          x: Dimension.SQUARE_SIZE,
          y: Dimension.SQUARE_SIZE,
          speed: Speed.DROP_DETACHED,
        },
      ],
    },
  ],
])('removeScanned, %s', (_, input, output) => {
  const result = removeScanned(input);
  expect(result).toEqual(output);
});
