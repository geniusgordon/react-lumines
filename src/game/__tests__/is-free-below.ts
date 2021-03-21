import { isFreeBelowCord } from '../grid';
import { Color } from '../types';
import { Dimension } from '../../constants';

test.each([
  [
    'is free below',
    [[null, null]],
    { x: 0, y: 0.5 * Dimension.SQUARE_SIZE },
    true,
  ],
  [
    'has color below',
    [[null, { color: Color.LIGHT, matched: false, scanned: false }]],
    { x: 0, y: 0.5 * Dimension.SQUARE_SIZE },
    false,
  ],
  [
    'near border',
    [[null, null]],
    { x: 0, y: 1 * Dimension.SQUARE_SIZE + 0.5 * Dimension.SQUARE_SIZE },
    false,
  ],
])('isFreeBelowCord, %s', (_, grid, cord, output) => {
  const result = isFreeBelowCord(grid, cord);
  expect(result).toEqual(output);
});
