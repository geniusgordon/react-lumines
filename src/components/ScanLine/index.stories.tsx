import React from 'react';
import { Story, Meta } from '@storybook/react';
import ScanLine, { ScanLineProps } from '.';
import SvgDecorator from '../SvgDecorator';

const Template: Story<ScanLineProps> = args => <ScanLine {...args} />;

export const DemoScanLine = Template.bind({});
DemoScanLine.args = {
  x: 0,
  matchedCount: 10,
};

export default {
  title: 'ScanLine',
  component: ScanLine,
  decorators: SvgDecorator,
} as Meta;
