import React from 'react';
import { Meta } from '@storybook/react';
import { Palette } from '../constants';

const SvgDecorator: Meta['decorators'] = [
  Story => (
    <div
    style={{
        padding: 20,
        backgroundColor: Palette.BACKGROUND,
      }}
    >
      <svg>
        <Story />
      </svg>
    </div>
  ),
];

export default SvgDecorator;
