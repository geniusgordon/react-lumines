import React from 'react';
import { Story, Meta } from '@storybook/react';
import Queue, { QueueProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';

const Template: Story<QueueProps> = args => <Queue {...args} />;

export const DemoQueue = Template.bind({});
DemoQueue.args = {
  queue: [
    [
      [Color.LIGHT, Color.LIGHT],
      [Color.DARK, Color.LIGHT],
    ],
    [
      [Color.LIGHT, Color.DARK],
      [Color.LIGHT, Color.DARK],
    ],
    [
      [Color.LIGHT, Color.DARK],
      [Color.DARK, Color.LIGHT],
    ],
  ],
};

export default {
  title: 'Queue',
  component: Queue,
  decorators: SvgDecorator,
} as Meta;
