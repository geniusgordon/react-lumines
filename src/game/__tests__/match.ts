import { isMatch } from '../grid';
import { Color } from '../types';

test('isMatch', () => {
  const grid = [
    [
      { color: Color.LIGHT, matched: false, scanned: false },
      { color: Color.LIGHT, matched: false, scanned: false },
    ],
    [
      { color: Color.LIGHT, matched: false, scanned: false },
      { color: Color.LIGHT, matched: false, scanned: false },
    ],
  ];
  const result = isMatch(grid, 0, 0);
  expect(result).toBeTruthy();
});

test.each([
  [
    'different colors',
    [
      [
        { color: Color.DARK, matched: false, scanned: false },
        { color: Color.LIGHT, matched: false, scanned: false },
      ],
      [
        { color: Color.DARK, matched: false, scanned: false },
        { color: Color.LIGHT, matched: false, scanned: false },
      ],
    ],
    0,
    0,
  ],
  [
    'has empty colors',
    [
      [{ color: Color.DARK, matched: false, scanned: false }, null],
      [null, { color: Color.LIGHT, matched: false, scanned: false }],
    ],
    0,
    0,
  ],
])('not isMatch, %s', (_, grid, col, row) => {
  const result = isMatch(grid, col, row);
  expect(result).toBeFalsy();
});
