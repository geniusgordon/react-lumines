import React from 'react';
import { Meta } from '@storybook/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';

const Decorator: Meta['decorators'] = [
  Story => (
    <ThemeProvider theme={theme}>
      <Story />
    </ThemeProvider>
  ),
];

export default Decorator;
