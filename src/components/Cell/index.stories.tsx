import React from 'react';
import { Story, Meta } from '@storybook/react';
import Cell, { CellProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';

const Template: Story<CellProps> = args => <Cell {...args} />;

export const LightCell = Template.bind({});
LightCell.args = {
  color: Color.LIGHT,
};

export const DarkCell = Template.bind({});
DarkCell.args = {
  color: Color.DARK,
};

export const ScannedCell = Template.bind({});
ScannedCell.args = {
  scanned: true,
};

export default {
  title: 'Cell',
  component: Cell,
  decorators: SvgDecorator,
} as Meta;
