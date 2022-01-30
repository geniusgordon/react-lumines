import { createGridWithCells, CellInput } from '../test-helpers';
import { Color } from '../types';

const cells: CellInput[] = [
  [1, 0, Color.LIGHT],
  [1, 1, Color.DARK],
  [1, 2, Color.DARK, { col: 1, row: 1 }],
  [1, 3, Color.DARK, { col: 1, row: 1 }, true],
];

test.each([
  [
    2,
    4,
    cells,
    [
      [null, null, null, null],
      [
        { color: Color.LIGHT, col: 1, row: 0 },
        { color: Color.DARK, col: 1, row: 1 },
        {
          color: Color.DARK,
          col: 1,
          row: 2,
          matchedBlock: { col: 1, row: 1 },
        },
        {
          color: Color.DARK,
          col: 1,
          row: 3,
          matchedBlock: { col: 1, row: 1 },
          scanned: true,
        },
      ],
    ],
  ],
])('createGridWithCells', (col, row, cells, output) => {
  const result = createGridWithCells(col, row, cells);
  expect(result).toEqual(output);
});
