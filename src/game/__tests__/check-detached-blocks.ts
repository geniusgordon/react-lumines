import { checkDetachedBlocks } from '../tick';
import { Color } from '../types';
import { Dimension, Speed } from '../../constants';

test.each([
  [
    'isFreeBelow',
    [[null, null]],
    [
      {
        color: Color.LIGHT,
        x: 0,
        y: 0.5 * Dimension.SQUARE_SIZE,
        speed: Speed.DROP_DETACHED,
      },
    ],
    {
      grid: [[null, null]],
      detachedBlocks: [
        {
          color: Color.LIGHT,
          x: 0,
          y: 0.5 * Dimension.SQUARE_SIZE,
          speed: Speed.DROP_DETACHED,
        },
      ],
    },
  ],
  [
    'one collide',
    [[null, { color: Color.LIGHT }]],
    [
      {
        color: Color.LIGHT,
        x: 0,
        y: 0.5 * Dimension.SQUARE_SIZE,
        speed: Speed.DROP_DETACHED,
      },
    ],
    {
      grid: [[{ color: Color.LIGHT }, { color: Color.LIGHT }]],
      detachedBlocks: [],
    },
  ],
  [
    'two collide',
    [[null, null, { color: Color.LIGHT }]],
    [
      {
        color: Color.DARK,
        x: 0,
        y: 1.5 * Dimension.SQUARE_SIZE,
        speed: Speed.DROP_DETACHED,
      },
      {
        color: Color.LIGHT,
        x: 0,
        y: 0.5 * Dimension.SQUARE_SIZE,
        speed: Speed.DROP_DETACHED,
      },
    ],
    {
      grid: [
        [{ color: Color.LIGHT }, { color: Color.DARK }, { color: Color.LIGHT }],
      ],
      detachedBlocks: [],
    },
  ],
  [
    'two collide bottom',
    [[null, null]],
    [
      {
        color: Color.DARK,
        x: 0,
        y: 1.5 * Dimension.SQUARE_SIZE,
        speed: Speed.DROP_DETACHED,
      },
      {
        color: Color.LIGHT,
        x: 0,
        y: 0.5 * Dimension.SQUARE_SIZE,
        speed: Speed.DROP_DETACHED,
      },
    ],
    {
      grid: [[{ color: Color.LIGHT }, { color: Color.DARK }]],
      detachedBlocks: [],
    },
  ],
])('checkDetachedBlocks %s', (_, grid, detachedBlocks, output) => {
  const result = checkDetachedBlocks(grid, detachedBlocks);
  expect(result).toEqual(output);
});
