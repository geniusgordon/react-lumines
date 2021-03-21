import { rotate, decompse } from '../block';
import { Color, RotateDirection } from '../types';
import { Dimension } from '../../constants';

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
    },
    [
      { color: Color.DARK, x: 0, y: Dimension.SQUARE_SIZE },
      { color: Color.LIGHT, x: 0, y: 0 },
      {
        color: Color.DARK,
        x: Dimension.SQUARE_SIZE,
        y: Dimension.SQUARE_SIZE,
      },
      { color: Color.LIGHT, x: Dimension.SQUARE_SIZE, y: 0 },
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
    },
    [
      {
        color: Color.LIGHT,
        x: 0.5 * Dimension.SQUARE_SIZE,
        y: 1.5 * Dimension.SQUARE_SIZE,
      },
      {
        color: Color.DARK,
        x: 0.5 * Dimension.SQUARE_SIZE,
        y: 0.5 * Dimension.SQUARE_SIZE,
      },
      {
        color: Color.DARK,
        x: 1.5 * Dimension.SQUARE_SIZE,
        y: 1.5 * Dimension.SQUARE_SIZE,
      },
      {
        color: Color.LIGHT,
        x: 1.5 * Dimension.SQUARE_SIZE,
        y: 0.5 * Dimension.SQUARE_SIZE,
      },
    ],
  ],
])('decompse active block', (input, output) => {
  const result = decompse(input);
  expect(result).toEqual(output);
});
