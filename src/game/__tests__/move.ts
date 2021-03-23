import { move } from '../block';
import { Color } from '../types';
import { Dimension } from '../../constants';

test.each([
  [
    'can move',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
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
    },
  ],
  [
    'is wall',
    {
      block: [],
      x: 0,
      y: 0,
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
    },
  ],
  [
    'top has block',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
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
    },
  ],
  [
    'bottom has block',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
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
    },
  ],
  [
    'is wall',
    {
      block: [],
      x: Dimension.SQUARE_SIZE,
      y: 0,
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
    },
  ],
  [
    'top has block',
    {
      block: [],
      x: 0,
      y: 0,
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
    },
  ],
  [
    'bottom has block',
    {
      block: [],
      x: 0,
      y: 0,
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
    },
  ],
])('move right, %s', (_, block, distance, grid, output) => {
  const result = move(block, distance, grid);
  expect(result).toEqual(output);
});
