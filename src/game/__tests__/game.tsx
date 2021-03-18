import { rotate, addToColumn } from '../utils';
import { Color, RotateDirection } from '../../types';

test.each([
  [
    [[Color.LIGHT, Color.DARK], [Color.LIGHT, Color.LIGHT]],
    [[Color.DARK, Color.LIGHT], [Color.LIGHT, Color.LIGHT]],
  ],
  [
    [[Color.LIGHT, Color.DARK], [Color.LIGHT, Color.DARK]],
    [[Color.DARK, Color.DARK], [Color.LIGHT, Color.LIGHT]],
  ],
])('rotate block clockwise', (input, output) => {
  const result = rotate(input, RotateDirection.CW);
  expect(result).toEqual(output);
});

test.each([
  [
    [[Color.LIGHT, Color.DARK], [Color.LIGHT, Color.LIGHT]],
    [[Color.LIGHT, Color.LIGHT], [Color.LIGHT, Color.DARK]],
  ],
  [
    [[Color.LIGHT, Color.DARK], [Color.LIGHT, Color.DARK]],
    [[Color.LIGHT, Color.LIGHT], [Color.DARK, Color.DARK]],
  ],
])('rotate block counter-clockwise', (input, output) => {
  const result = rotate(input, RotateDirection.CCW);
  expect(result).toEqual(output);
});

test.each([
  [
    [Color.LIGHT, Color.DARK],
    [null, null, null, null, null],
    [null, null, null, Color.LIGHT, Color.DARK],
  ],
  [
    [Color.LIGHT, Color.DARK],
    [null, null, null, null, Color.DARK],
    [null, null, Color.LIGHT, Color.DARK, Color.DARK],
  ],
  [
    [Color.LIGHT, Color.DARK],
    [null, Color.DARK],
    [Color.DARK, Color.DARK],
  ],
])('add blocks to column', (block, column, output) => {
  const result = addToColumn(block, column);
  expect(result).toEqual(output);
});
