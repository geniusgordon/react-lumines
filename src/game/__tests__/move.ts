import { move } from '../block';
import { Color } from '../types';
import { Dimension, Speed } from '../../constants';

test.each([
  [
    'can move',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    -Dimension.SQUARE_SIZE,
    [
      [null, null],
      [null, null],
      [null, null],
    ],
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
  [
    'is wall',
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    -Dimension.SQUARE_SIZE,
    [
      [null, null],
      [null, null],
      [null, null],
    ],
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
  [
    'top has block',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    -Dimension.SQUARE_SIZE,
    [
      [{ color: Color.LIGHT }, { color: Color.LIGHT }],
      [null, null],
      [null, null],
    ],
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
  [
    'bottom has block',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    -Dimension.SQUARE_SIZE,
    [
      [null, { color: Color.LIGHT }],
      [null, null],
      [null, null],
    ],
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
])('move left, %s', (_, block, distance, grid, output) => {
  const result = move(block, distance, grid);
  expect(result).toEqual(output);
});

test.each([
  [
    'can move',
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    Dimension.SQUARE_SIZE,
    [
      [null, null],
      [null, null],
      [null, null],
    ],
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
  [
    'is wall',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    Dimension.SQUARE_SIZE,
    [
      [null, null],
      [null, null],
      [null, null],
    ],
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
  [
    'top has block',
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    Dimension.SQUARE_SIZE,
    [
      [null, null],
      [null, null],
      [{ color: Color.LIGHT }, { color: Color.LIGHT }],
    ],
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
  [
    'bottom has block',
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    Dimension.SQUARE_SIZE,
    [
      [null, null],
      [null, null],
      [null, { color: Color.LIGHT }],
    ],
    {
      block: [],
      x: 0,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
  ],
])('move right, %s', (_, block, distance, grid, output) => {
  const result = move(block, distance, grid);
  expect(result).toEqual(output);
});
