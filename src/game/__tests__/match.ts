import {
  getCellsInSquare,
  isSameColor,
  isMatchedBlock,
  isSameMatchedBlock,
  updateMatchedBlocks,
} from '../grid';
import { createGridWithCells } from '../test-helpers';
import { Color } from '../types';

test.each([
  [
    '4 cells',
    createGridWithCells(2, 2, [
      [0, 0, Color.LIGHT],
      [0, 1, Color.LIGHT],
      [1, 0, Color.LIGHT],
      [1, 1, Color.LIGHT],
    ]),
    [
      { color: Color.LIGHT, col: 0, row: 0 },
      { color: Color.LIGHT, col: 0, row: 1 },
      { color: Color.LIGHT, col: 1, row: 0 },
      { color: Color.LIGHT, col: 1, row: 1 },
    ],
  ],
  [
    'has empty colors',
    createGridWithCells(2, 2, [
      [0, 1, Color.LIGHT],
      [1, 0, Color.LIGHT],
    ]),
    [
      { color: Color.LIGHT, col: 0, row: 1 },
      { color: Color.LIGHT, col: 1, row: 0 },
    ],
  ],
])('getCellsInSquare', (_, grid, output) => {
  const result = getCellsInSquare(grid, 0, 0);
  expect(result).toEqual(output);
});

test.each([
  [
    'is same',
    [
      { color: Color.LIGHT, col: 0, row: 0 },
      { color: Color.LIGHT, col: 0, row: 1 },
      { color: Color.LIGHT, col: 1, row: 0 },
      { color: Color.LIGHT, col: 1, row: 1 },
    ],
    true,
  ],
  [
    'not same',
    [
      { color: Color.DARK, col: 0, row: 0 },
      { color: Color.LIGHT, col: 0, row: 1 },
    ],
    false,
  ],
  ['empty', [], false],
])('getCellsInSquare', (_, cells, output) => {
  const result = isSameColor(cells);
  expect(result).toEqual(output);
});

test.each([
  [
    'is matched',
    {
      color: Color.LIGHT,
      col: 0,
      row: 0,
      matchedBlock: { col: 0, row: 0 },
    },
    0,
    0,
    true,
  ],
  [
    'not is matched',
    {
      color: Color.LIGHT,
      col: 0,
      row: 0,
      matchedBlock: { col: 1, row: 0 },
    },
    0,
    0,
    false,
  ],
])('isMatchedBlock, %s', (_, cell, col, row, output) => {
  const result = isMatchedBlock(cell, col, row);
  expect(result).toBe(output);
});

test.each([
  [
    'same',
    { color: Color.LIGHT, col: 0, row: 0, matchedBlock: { col: 0, row: 0 } },
    { color: Color.LIGHT, col: 0, row: 0, matchedBlock: { col: 0, row: 0 } },
    true,
  ],
  [
    '1 matchedBlock undefined',
    { color: Color.LIGHT, col: 0, row: 0 },
    { color: Color.LIGHT, col: 0, row: 0, matchedBlock: { col: 0, row: 0 } },
    false,
  ],
  [
    '1 undefined',
    undefined,
    { color: Color.LIGHT, col: 0, row: 0, matchedBlock: { col: 0, row: 0 } },
    false,
  ],
])('isSameMatchedBlock, %s', (_, a, b, output) => {
  const resultA = isSameMatchedBlock(a, b);
  const resultB = isSameMatchedBlock(b, a);
  expect(resultA).toBe(output);
  expect(resultB).toBe(output);
});

test.each([
  [
    'match 1 block',
    createGridWithCells(2, 3, [
      [0, 1, Color.LIGHT],
      [0, 2, Color.LIGHT],
      [1, 1, Color.LIGHT],
      [1, 2, Color.LIGHT],
    ]),
    createGridWithCells(2, 3, [
      [0, 1, Color.LIGHT, { col: 0, row: 1 }],
      [0, 2, Color.LIGHT, { col: 0, row: 1 }],
      [1, 1, Color.LIGHT, { col: 0, row: 1 }],
      [1, 2, Color.LIGHT, { col: 0, row: 1 }],
    ]),
  ],
  [
    'match 2 blocks',
    createGridWithCells(3, 3, [
      [0, 1, Color.LIGHT],
      [0, 2, Color.LIGHT],
      [1, 1, Color.LIGHT],
      [1, 2, Color.LIGHT],
      [2, 1, Color.LIGHT],
      [2, 2, Color.LIGHT],
    ]),
    createGridWithCells(3, 3, [
      [0, 1, Color.LIGHT, { col: 0, row: 1 }],
      [0, 2, Color.LIGHT, { col: 0, row: 1 }],
      [1, 1, Color.LIGHT, { col: 1, row: 1 }],
      [1, 2, Color.LIGHT, { col: 1, row: 1 }],
      [2, 1, Color.LIGHT, { col: 1, row: 1 }],
      [2, 2, Color.LIGHT, { col: 1, row: 1 }],
    ]),
  ],
  [
    'clear not matched',
    createGridWithCells(2, 3, [
      [0, 1, Color.LIGHT, { col: 0, row: 1 }],
      [0, 2, Color.LIGHT, { col: 0, row: 1 }],
    ]),
    createGridWithCells(2, 3, [
      [0, 1, Color.LIGHT],
      [0, 2, Color.LIGHT],
    ]),
  ],
])('updateMatchedBlocks, %s', (_, input, output) => {
  const result = updateMatchedBlocks(input);
  expect(result).toEqual(output);
});
