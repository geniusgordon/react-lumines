import React from 'react';
import { Story, Meta } from '@storybook/react';
import Cell, { CellProps } from '.';

export default {
  title: 'Cell',
  component: Cell,
} as Meta;

const Template: Story<CellProps> = (args) => <Cell {...args} />;

export const Primary = Template.bind({});
Primary.args = {};
