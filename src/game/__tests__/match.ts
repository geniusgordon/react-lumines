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
  [
    "don't match scanned",
    [
      { color: Color.LIGHT, col: 0, row: 0 },
      { color: Color.LIGHT, col: 0, row: 1 },
      { color: Color.LIGHT, col: 1, row: 0, scanned: true },
      { color: Color.LIGHT, col: 1, row: 1, scanned: true },
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
    false,
  ],
])('isMatchedBlock, %s', (_, cell, output) => {
  const result = isMatchedBlock(cell);
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
    undefined,
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
    undefined,
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
    'match 2 blocks (has matched)',
    createGridWithCells(3, 3, [
      [0, 1, Color.LIGHT],
      [0, 2, Color.LIGHT],
      [1, 1, Color.LIGHT, { col: 1, row: 1 }],
      [1, 2, Color.LIGHT, { col: 1, row: 1 }],
      [2, 1, Color.LIGHT, { col: 1, row: 1 }],
      [2, 2, Color.LIGHT, { col: 1, row: 1 }],
    ]),
    undefined,
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
    "don't match scanned",
    createGridWithCells(3, 3, [
      [0, 1, Color.LIGHT],
      [0, 2, Color.LIGHT],
      [1, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [1, 2, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 2, Color.LIGHT, { col: 1, row: 1 }, true],
    ]),
    undefined,
    createGridWithCells(3, 3, [
      [0, 1, Color.LIGHT],
      [0, 2, Color.LIGHT],
      [1, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [1, 2, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 2, Color.LIGHT, { col: 1, row: 1 }, true],
    ]),
  ],
  [
    'clear match after scanned',
    createGridWithCells(3, 3, [
      [0, 1, Color.LIGHT, { col: 0, row: 1 }],
      [0, 2, Color.LIGHT, { col: 0, row: 1 }],
      [1, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [1, 2, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 2, Color.LIGHT, { col: 1, row: 1 }, true],
    ]),
    1,
    createGridWithCells(3, 3, [
      [0, 1, Color.LIGHT],
      [0, 2, Color.LIGHT],
      [1, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [1, 2, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 1, Color.LIGHT, { col: 1, row: 1 }, true],
      [2, 2, Color.LIGHT, { col: 1, row: 1 }, true],
    ]),
  ],
])('updateMatchedBlocks, %s', (_, input, scannedCol, output) => {
  const result = updateMatchedBlocks(input, scannedCol);
  expect(result).toEqual(output);
});
