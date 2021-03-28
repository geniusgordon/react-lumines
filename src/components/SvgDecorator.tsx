import React from 'react';
import { Meta } from '@storybook/react';
import { Palette } from '../constants';

const SvgDecorator: Meta['decorators'] = [
  Story => (
    <svg style={{ backgroundColor: Palette.BACKGROUND }}>
      <g transform="translate(20, 20)">
        <Story />
      </g>
    </svg>
  ),
];

export default SvgDecorator;
