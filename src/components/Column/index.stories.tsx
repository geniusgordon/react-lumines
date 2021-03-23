import React from 'react';
import { Story, Meta } from '@storybook/react';
import Column, { ColumnProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';

const Template: Story<ColumnProps> = args => <Column {...args} />;

export const DemoColumn = Template.bind({});
DemoColumn.args = {
  column: [
    {
      color: Color.DARK,
      matched: false,
      scanned: false,
    },
    {
      color: Color.LIGHT,
      matched: false,
      scanned: false,
    },
    {
      color: Color.LIGHT,
      matched: false,
      scanned: true,
    },
  ],
  x: 0,
};

export default {
  title: 'Column',
  component: Column,
  decorators: SvgDecorator,
} as Meta;