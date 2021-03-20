import { isFreeBelowCord } from '../grid';
import { Color } from '../types';
import { dimensions } from '../../constants';

test.each([
  [
    'is free below',
    [[null, null]],
    { x: 0, y: 0.5 * dimensions.SQUARE_SIZE },
    true,
  ],
  [
    'has color below',
    [[null, { color: Color.LIGHT, matched: false, scanned: false }]],
    { x: 0, y: 0.5 * dimensions.SQUARE_SIZE },
    false,
  ],
  [
    'near border',
    [[null, null]],
    { x: 0, y: 1 * dimensions.SQUARE_SIZE + 0.5 * dimensions.SQUARE_SIZE },
    false,
  ],
])('isFreeBelowCord, %s', (_, grid, cord, output) => {
  const result = isFreeBelowCord(grid, cord);
  expect(result).toEqual(output);
});
