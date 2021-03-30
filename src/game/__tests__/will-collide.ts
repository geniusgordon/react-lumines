import { activeBlockWillCollide } from '../tick';
import { Color } from '../types';
import { Dimension, Speed } from '../../constants';

test.each([
  [
    'not collide',
    {
      x: 0,
      y: 0.5 * Dimension.SQUARE_SIZE,
      block: [],
      speed: Speed.DROP_SLOW,
    },
    [
      [null, null, null],
      [null, null, null],
    ],
    false,
  ],
  [
    'left has color',
    {
      x: 0,
      y: 0.5 * Dimension.SQUARE_SIZE,
      block: [],
      speed: Speed.DROP_SLOW,
    },
    [
      [null, null, { color: Color.LIGHT }],
      [null, null, null],
    ],
    true,
  ],
  [
    'right has color',
    {
      x: 0,
      y: 0.5 * Dimension.SQUARE_SIZE,
      block: [],
      speed: Speed.DROP_SLOW,
    },
    [
      [null, null, null],
      [null, null, { color: Color.LIGHT }],
    ],
    true,
  ],
  [
    'touch bottom',
    {
      x: 0,
      y: 0.5 * Dimension.SQUARE_SIZE,
      block: [],
      speed: Speed.DROP_SLOW,
    },
    [
      [null, null],
      [null, null],
    ],
    true,
  ],
])('activeBlockWillCollide, %s', (_, block, grid, output) => {
  const result = activeBlockWillCollide(block, grid);
  expect(result).toBe(output);
});
