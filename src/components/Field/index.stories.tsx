import React from 'react';
import { Story, Meta } from '@storybook/react';
import Field, { FieldProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';
import { createGridWithCells } from '../../game/test-helpers';
import { Dimension, Speed } from '../../constants';

const Template: Story<FieldProps> = args => <Field {...args} />;

export const DemoField = Template.bind({});
DemoField.args = {
  grid: createGridWithCells(Dimension.GRID_COLUMNS, Dimension.GRID_ROWS, [
    [0, 8, Color.LIGHT, { col: 0, row: 8 }, true],
    [0, 9, Color.LIGHT, { col: 0, row: 8 }, true],
    [0, 10, Color.DARK],
    [0, 11, Color.LIGHT],
    [1, 7, Color.LIGHT, { col: 1, row: 7 }],
    [1, 8, Color.LIGHT, { col: 1, row: 8 }],
    [1, 9, Color.LIGHT, { col: 1, row: 8 }],
    [1, 10, Color.DARK],
    [1, 11, Color.LIGHT],
    [2, 7, Color.LIGHT, { col: 1, row: 7 }],
    [2, 8, Color.LIGHT, { col: 1, row: 8 }],
    [2, 9, Color.LIGHT, { col: 1, row: 8 }],
    [2, 10, Color.DARK],
    [2, 11, Color.LIGHT],
    [3, 9, Color.DARK, { col: 3, row: 9 }],
    [3, 10, Color.DARK, { col: 3, row: 10 }],
    [3, 11, Color.DARK, { col: 3, row: 10 }],
    [4, 9, Color.DARK, { col: 3, row: 9 }],
    [4, 10, Color.DARK, { col: 3, row: 10 }],
    [4, 11, Color.DARK, { col: 3, row: 10 }],
  ]),
  detachedBlocks: [
    {
      color: Color.LIGHT,
      x: 5 * Dimension.SQUARE_SIZE,
      y: 10.5 * Dimension.SQUARE_SIZE,
      speed: {
        x: 0,
        y: Speed.DROP_DETACHED,
      },
    },
    {
      color: Color.LIGHT,
      x: 5 * Dimension.SQUARE_SIZE,
      y: 9.5 * Dimension.SQUARE_SIZE,
      speed: {
        x: 0,
        y: Speed.DROP_DETACHED,
      },
    },
  ],
};

export default {
  title: 'Field',
  component: Field,
  decorators: SvgDecorator,
} as Meta;
