import React from 'react';
import { Story, Meta } from '@storybook/react';
import Field, { FieldProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';

const Template: Story<FieldProps> = args => <Field {...args} />;

export const DemoField = Template.bind({});
DemoField.args = {
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
  title: 'Field',
  component: Field,
  decorators: SvgDecorator,
} as Meta;
