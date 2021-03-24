import { isMatch, updateMatchedBlocks } from '../grid';
import { Color } from '../types';

test('isMatch', () => {
  const grid = [
    [{ color: Color.LIGHT }, { color: Color.LIGHT }],
    [{ color: Color.LIGHT }, { color: Color.LIGHT }],
  ];
  const result = isMatch(grid, 0, 0);
  expect(result).toBeTruthy();
});

test.each([
  [
    'different colors',
    [
      [{ color: Color.DARK }, { color: Color.LIGHT }],
      [{ color: Color.DARK }, { color: Color.LIGHT }],
    ],
    0,
    0,
  ],
  [
    'has empty colors',
    [
      [{ color: Color.DARK }, null],
      [null, { color: Color.LIGHT }],
    ],
    0,
    0,
  ],
])('not isMatch, %s', (_, grid, col, row) => {
  const result = isMatch(grid, col, row);
  expect(result).toBeFalsy();
});

test.each([
  [
    'match 1 block',
    [
      [null, { color: Color.LIGHT }, { color: Color.LIGHT }],
      [null, { color: Color.LIGHT }, { color: Color.LIGHT }],
    ],
    [
      [
        null,
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
      ],
      [
        null,
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
      ],
    ],
  ],
  [
    'match 2 blocks',
    [
      [null, { color: Color.LIGHT }, { color: Color.LIGHT }],
      [null, { color: Color.LIGHT }, { color: Color.LIGHT }],
      [null, { color: Color.LIGHT }, { color: Color.LIGHT }],
    ],
    [
      [
        null,
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
      ],
      [
        null,
        { color: Color.LIGHT, matchedBlock: { col: 1, row: 1 } },
        { color: Color.LIGHT, matchedBlock: { col: 1, row: 1 } },
      ],
      [
        null,
        { color: Color.LIGHT, matchedBlock: { col: 1, row: 1 } },
        { color: Color.LIGHT, matchedBlock: { col: 1, row: 1 } },
      ],
    ],
  ],
  [
    'clear not matched',
    [
      [
        null,
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
        { color: Color.LIGHT },
      ],
      [
        null,
        { color: Color.LIGHT, matchedBlock: { col: 1, row: 1 } },
        { color: Color.DARK },
      ],
      [null, null],
    ],
    [
      [
        null,
        { color: Color.LIGHT, matchedBlock: undefined },
        { color: Color.LIGHT },
      ],
      [null, { color: Color.LIGHT }, { color: Color.DARK }],
      [null, null],
    ],
  ],
])('updateMatchedBlocks, %s', (_, input, output) => {
  const result = updateMatchedBlocks(input);
  expect(result).toEqual(output);
});
