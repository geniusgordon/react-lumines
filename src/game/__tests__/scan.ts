import { scanColumn } from '../grid';
import { Color } from '../types';

test.each([
  [
    'scan',
    [
      [
        null,
        { color: Color.LIGHT },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 } },
      ],
    ],
    [
      [
        null,
        { color: Color.LIGHT },
        { color: Color.LIGHT, matchedBlock: { col: 0, row: 1 }, scanned: true },
      ],
    ],
  ],
])('scanColumn, %s', (_, input, output) => {
  const result = scanColumn(input);
  expect(result).toEqual(output);
});
