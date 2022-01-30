import React from 'react';
import { Story, Meta } from '@storybook/react';
import Info, { InfoProps } from '.';
import SvgDecorator from '../SvgDecorator';

const Template: Story<InfoProps> = args => <Info {...args} />;

export const DemoInfo = Template.bind({});
DemoInfo.args = {
  time: 90,
  score: 100,
};

export default {
  title: 'Info',
  component: Info,
  decorators: SvgDecorator,
} as Meta;
