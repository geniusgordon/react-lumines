import { activeBlockWillCollide } from '../tick';
import { Color } from '../types';
import { createGridWithCells } from '../test-helpers';
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
    createGridWithCells(2, 3, []),
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
    createGridWithCells(2, 3, [[0, 2, Color.LIGHT]]),
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
    createGridWithCells(2, 3, [[1, 2, Color.LIGHT]]),
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
    createGridWithCells(2, 2, []),
    true,
  ],
])('activeBlockWillCollide, %s', (_, block, grid, output) => {
  const result = activeBlockWillCollide(block, grid);
  expect(result).toBe(output);
});
