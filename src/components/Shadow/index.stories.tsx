import React from 'react';
import { Story, Meta } from '@storybook/react';
import Shadow, { ShadowProps } from '.';
import SvgDecorator from '../SvgDecorator';

const Template: Story<ShadowProps> = args => <Shadow {...args} />;

export const DemoShadow = Template.bind({});
DemoShadow.args = {
  x: 0,
};

export default {
  title: 'Shadow',
  component: Shadow,
  decorators: SvgDecorator,
} as Meta;
