import { scanColumn } from '../grid';
import { Color } from '../types';

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
      count: 1,
    },
  ],
])('scanColumn, %s', (_, grid, column, output) => {
  const result = scanColumn(grid, column);
  expect(result).toEqual(output);
});
