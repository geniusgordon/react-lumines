import React from 'react';
import { Story, Meta } from '@storybook/react';
import Countdown, { CountdownProps } from '.';
import SvgDecorator from '../SvgDecorator';

const Template: Story<CountdownProps> = args => <Countdown {...args} />;

export const DemoCountdown = Template.bind({});
DemoCountdown.args = {
  time: 3,
};

export default {
  title: 'Countdown',
  component: Countdown,
  decorators: SvgDecorator,
} as Meta;
