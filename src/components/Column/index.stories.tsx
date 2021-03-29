import React from 'react';
import { Story, Meta } from '@storybook/react';
import Column, { ColumnProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';
import { Dimension } from '../../constants';

const Template: Story<ColumnProps> = args => <Column {...args} />;

export const DemoColumn = Template.bind({});
DemoColumn.args = {
  column: [
    { color: Color.DARK, x: 0, y: Dimension.SQUARE_SIZE },
    { color: Color.LIGHT, x: 0, y: 2 * Dimension.SQUARE_SIZE },
    { color: Color.LIGHT, x: 0, y: 3 * Dimension.SQUARE_SIZE },
  ],
  x: 0,
};

export default {
  title: 'Column',
  component: Column,
  decorators: SvgDecorator,
} as Meta;
