import React from 'react';
import { Story, Meta } from '@storybook/react';
import PauseMenu, { PauseMenuProps } from './PauseMenu';
import Decorator from '../Decorator';

const PauseMenuTemplate: Story<PauseMenuProps> = args => (
  <PauseMenu {...args} />
);

export const DemoPauseMenu = PauseMenuTemplate.bind({});

export default {
  title: 'Pause Menu',
  component: PauseMenu,
  decorators: Decorator,
} as Meta;
