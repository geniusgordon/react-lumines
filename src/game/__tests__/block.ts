import { rotate, decompose, nextBlockY } from '../block';
import { Color, RotateDirection } from '../types';
import { Dimension, Speed } from '../../constants';

test.each([
  [
    [
      [Color.LIGHT, Color.DARK],
      [Color.LIGHT, Color.LIGHT],
    ],
    [
      [Color.DARK, Color.LIGHT],
      [Color.LIGHT, Color.LIGHT],
    ],
  ],
  [
    [
      [Color.LIGHT, Color.DARK],
      [Color.LIGHT, Color.DARK],
    ],
    [
      [Color.DARK, Color.DARK],
      [Color.LIGHT, Color.LIGHT],
    ],
  ],
])('rotate block clockwise', (input, output) => {
  const result = rotate(input, RotateDirection.CW);
  expect(result).toEqual(output);
});

test.each([
  [
    [
      [Color.LIGHT, Color.DARK],
      [Color.LIGHT, Color.LIGHT],
    ],
    [
      [Color.LIGHT, Color.LIGHT],
      [Color.LIGHT, Color.DARK],
    ],
  ],
  [
    [
      [Color.LIGHT, Color.DARK],
      [Color.LIGHT, Color.DARK],
    ],
    [
      [Color.LIGHT, Color.LIGHT],
      [Color.DARK, Color.DARK],
    ],
  ],
])('rotate block counter-clockwise', (input, output) => {
  const result = rotate(input, RotateDirection.CCW);
  expect(result).toEqual(output);
});

test.each([
  [
    {
      block: [
        [Color.LIGHT, Color.DARK],
        [Color.LIGHT, Color.DARK],
      ],
      x: 0,
      y: 0,
      speed: {
        x: 0,
        y: Speed.DROP_SLOW,
      },
    },
    [
      {
        color: Color.DARK,
        x: 0,
        y: Dimension.SQUARE_SIZE,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
      {
        color: Color.LIGHT,
        x: 0,
        y: 0,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
      {
        color: Color.DARK,
        x: Dimension.SQUARE_SIZE,
        y: Dimension.SQUARE_SIZE,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
      {
        color: Color.LIGHT,
        x: Dimension.SQUARE_SIZE,
        y: 0,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
    ],
  ],
  [
    {
      block: [
        [Color.DARK, Color.LIGHT],
        [Color.LIGHT, Color.DARK],
      ],
      x: 0.5 * Dimension.SQUARE_SIZE,
      y: 0.5 * Dimension.SQUARE_SIZE,
      speed: {
        x: 0,
        y: Speed.DROP_SLOW,
      },
    },
    [
      {
        color: Color.LIGHT,
        x: 0.5 * Dimension.SQUARE_SIZE,
        y: 1.5 * Dimension.SQUARE_SIZE,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
      {
        color: Color.DARK,
        x: 0.5 * Dimension.SQUARE_SIZE,
        y: 0.5 * Dimension.SQUARE_SIZE,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
      {
        color: Color.DARK,
        x: 1.5 * Dimension.SQUARE_SIZE,
        y: 1.5 * Dimension.SQUARE_SIZE,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
      {
        color: Color.LIGHT,
        x: 1.5 * Dimension.SQUARE_SIZE,
        y: 0.5 * Dimension.SQUARE_SIZE,
        speed: {
          x: 0,
          y: Speed.DROP_DETACHED,
        },
      },
    ],
  ],
])('decompse active block', (input, output) => {
  const result = decompose(input);
  expect(result).toEqual(output);
});

test.each([
  [
    'next',
    {
      block: [],
      x: 0,
      y: 0,
      speed: {
        x: 0,
        y: Speed.DROP_SLOW,
      },
    },
    0.1,
    Speed.DROP_SLOW * 0.1,
  ],
  [
    'move over one block',
    {
      block: [],
      x: 0,
      y: 0,
      speed: {
        x: 0,
        y: Speed.DROP_FAST,
      },
    },
    Dimension.SQUARE_SIZE / Speed.DROP_FAST + 1,
    Dimension.SQUARE_SIZE,
  ],
])('nextBlockY, %s', (_, block, time, output) => {
  const result = nextBlockY(block, time);
  expect(result).toBe(output);
});
