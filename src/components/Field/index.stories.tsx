import React from 'react';
import { Story, Meta } from '@storybook/react';
import Field, { FieldProps } from '.';
import SvgDecorator from '../SvgDecorator';
import { Color } from '../../game/types';

const Template: Story<FieldProps> = args => <Field {...args} />;

export const DemoField = Template.bind({});
DemoField.args = {
  grid: [
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { color: Color.LIGHT, matchedBlock: { col: 0, row: 8 }, scanned: true },
      { color: Color.LIGHT, matchedBlock: { col: 0, row: 8 }, scanned: true },
      { color: Color.DARK },
      { color: Color.LIGHT },
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { color: Color.LIGHT, matchedBlock: { col: 1, row: 7 } },
      { color: Color.LIGHT, matchedBlock: { col: 1, row: 8 } },
      { color: Color.LIGHT, matchedBlock: { col: 1, row: 8 } },
      { color: Color.DARK },
      { color: Color.LIGHT },
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { color: Color.LIGHT, matchedBlock: { col: 1, row: 7 } },
      { color: Color.LIGHT, matchedBlock: { col: 1, row: 8 } },
      { color: Color.LIGHT, matchedBlock: { col: 1, row: 8 } },
      { color: Color.DARK },
      { color: Color.LIGHT },
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { color: Color.DARK, matchedBlock: { col: 3, row: 9 } },
      { color: Color.DARK, matchedBlock: { col: 3, row: 10 } },
      { color: Color.DARK, matchedBlock: { col: 3, row: 10 } },
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { color: Color.DARK, matchedBlock: { col: 3, row: 9 } },
      { color: Color.DARK, matchedBlock: { col: 3, row: 10 } },
      { color: Color.DARK, matchedBlock: { col: 3, row: 10 } },
    ],
  ],
};

export default {
  title: 'Field',
  component: Field,
  decorators: SvgDecorator,
} as Meta;
