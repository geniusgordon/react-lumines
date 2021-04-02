import { move } from '../block';
import { Color } from '../types';
import { createGridWithCells } from '../test-helpers';
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
    createGridWithCells(3, 2, []),
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
    createGridWithCells(3, 2, []),
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
    createGridWithCells(3, 2, [
      [0, 0, Color.LIGHT],
      [0, 1, Color.LIGHT],
    ]),
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
    createGridWithCells(3, 2, [[0, 1, Color.LIGHT]]),
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
    createGridWithCells(3, 2, []),
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
    createGridWithCells(3, 2, []),
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
    createGridWithCells(3, 2, [
      [2, 0, Color.LIGHT],
      [2, 1, Color.LIGHT],
    ]),
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
    createGridWithCells(3, 2, [[2, 1, Color.LIGHT]]),
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
