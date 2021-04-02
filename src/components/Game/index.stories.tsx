import React from 'react';
import { Story, Meta } from '@storybook/react';
import Game, { GameProps } from '.';
import { Color } from '../../game/types';
import { createGridWithCells } from '../../game/test-helpers';
import { Dimension, Palette, Speed } from '../../constants';

const Template: Story<GameProps> = args => <Game {...args} />;

export const DemoGame = Template.bind({});
DemoGame.args = {
  game: {
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
    activeBlock: {
      x: 7 * Dimension.SQUARE_SIZE,
      y: 0,
      block: [
        [Color.LIGHT, Color.DARK],
        [Color.DARK, Color.LIGHT],
      ],
      speed: Speed.DROP_SLOW,
    },
    detachedBlocks: [],
    scanLine: {
      x: 60,
      speed: Speed.SCAN_LINE,
    },
    matchedCount: 0,
    scannedCount: 0,
    grid: createGridWithCells(Dimension.GRID_COLUMNS, Dimension.GRID_ROWS, [
      [0, 8, Color.LIGHT, { col: 0, row: 8 }, true],
      [0, 9, Color.LIGHT, { col: 0, row: 8 }, true],
      [0, 10, Color.DARK],
      [0, 11, Color.LIGHT],
      [1, 7, Color.LIGHT, { col: 1, row: 7 }],
      [1, 8, Color.LIGHT, { col: 1, row: 8 }],
      [1, 9, Color.LIGHT, { col: 1, row: 8 }],
      [1, 10, Color.DARK],
      [1, 11, Color.LIGHT],
      [2, 7, Color.LIGHT, { col: 1, row: 7 }],
      [2, 8, Color.LIGHT, { col: 1, row: 8 }],
      [2, 9, Color.LIGHT, { col: 1, row: 8 }],
      [2, 10, Color.DARK],
      [2, 11, Color.LIGHT],
      [3, 9, Color.DARK, { col: 3, row: 9 }],
      [3, 10, Color.DARK, { col: 3, row: 10 }],
      [3, 11, Color.DARK, { col: 3, row: 10 }],
      [4, 9, Color.DARK, { col: 3, row: 9 }],
      [4, 10, Color.DARK, { col: 3, row: 10 }],
      [4, 11, Color.DARK, { col: 3, row: 10 }],
    ]),
  },
};

export default {
  title: 'Game',
  component: Game,
  decorators: [
    Story => (
      <div style={{ backgroundColor: Palette.BACKGROUND }}>
        <Story />
      </div>
    ),
  ],
} as Meta;
