import React from 'react';
import { Story, Meta } from '@storybook/react';
import Block, { BlockProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';

const Template: Story<BlockProps> = args => <Block {...args} />;

export const DemoBlock = Template.bind({});
DemoBlock.args = {
  x: 0,
  y: 0,
  block: [
    [Color.LIGHT, Color.LIGHT],
    [Color.DARK, Color.LIGHT],
  ],
};

export default {
  title: 'Block',
  component: Block,
  decorators: SvgDecorator,
} as Meta;
