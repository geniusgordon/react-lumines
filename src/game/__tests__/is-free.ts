import { isFree, isFreeBelow } from '../grid';
import { Color } from '../types';
import { Dimension } from '../../constants';

test.each([
  ['is free', [[null, null]], { x: 0, y: 0.5 * Dimension.SQUARE_SIZE }, true],
  [
    'has color',
    [[{ color: Color.LIGHT, col: 0, row: 0 }]],
    { x: 0, y: 0.5 * Dimension.SQUARE_SIZE },
    false,
  ],
  [
    'out of left bound',
    [[null, null]],
    { x: -Dimension.SQUARE_SIZE, y: 0 },
    false,
  ],
  [
    'out of right bound',
    [[null, null]],
    { x: Dimension.SQUARE_SIZE, y: 0 },
    false,
  ],
  [
    'out of top bound',
    [[null, null]],
    { x: 0, y: -Dimension.SQUARE_SIZE },
    false,
  ],
  [
    'out of bottom bound',
    [[null, null]],
    { x: 0, y: 2 * Dimension.SQUARE_SIZE + 0.5 * Dimension.SQUARE_SIZE },
    false,
  ],
])('isFree, %s', (_, grid, cord, output) => {
  const result = isFree(grid, cord);
  expect(result).toEqual(output);
});

test.each([
  [
    'is free below',
    [[null, null]],
    { x: 0, y: 0.5 * Dimension.SQUARE_SIZE },
    true,
  ],
  [
    'has color below',
    [[null, { color: Color.LIGHT, col: 0, row: 0 }]],
    { x: 0, y: 0.5 * Dimension.SQUARE_SIZE },
    false,
  ],
  [
    'near border',
    [[null, null]],
    { x: 0, y: 1 * Dimension.SQUARE_SIZE + 0.5 * Dimension.SQUARE_SIZE },
    false,
  ],
])('isFreeBelow, %s', (_, grid, cord, output) => {
  const result = isFreeBelow(grid, cord);
  expect(result).toEqual(output);
});
