import { checkDetachedBlocks } from '../tick';
import { Color } from '../types';
import { createGridWithCells } from '../test-helpers';
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
    createGridWithCells(1, 2, [[0, 1, Color.LIGHT]]),
    [
      {
        color: Color.LIGHT,
        x: 0,
        y: 0.5 * Dimension.SQUARE_SIZE,
        speed: Speed.DROP_DETACHED,
      },
    ],
    {
      grid: createGridWithCells(1, 2, [
        [0, 0, Color.LIGHT],
        [0, 1, Color.LIGHT],
      ]),
      detachedBlocks: [],
    },
  ],
  [
    'two collide',
    createGridWithCells(1, 3, [[0, 2, Color.LIGHT]]),
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
      grid: createGridWithCells(1, 3, [
        [0, 0, Color.LIGHT],
        [0, 1, Color.DARK],
        [0, 2, Color.LIGHT],
      ]),
      detachedBlocks: [],
    },
  ],
  [
    'two collide bottom',
    createGridWithCells(1, 2, []),
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
      grid: createGridWithCells(1, 2, [
        [0, 0, Color.LIGHT],
        [0, 1, Color.DARK],
      ]),
      detachedBlocks: [],
    },
  ],
])('checkDetachedBlocks %s', (_, grid, detachedBlocks, output) => {
  const result = checkDetachedBlocks(grid, detachedBlocks);
  expect(result).toEqual(output);
});
