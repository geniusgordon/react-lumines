import React from 'react';
import { Story, Meta } from '@storybook/react';
import Game, { GameProps } from '.';
import { Color } from '../../game/types';
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
    scannedCount: 0,
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
      [...new Array(Dimension.GRID_ROWS)].map(() => null),
      [...new Array(Dimension.GRID_ROWS)].map(() => null),
      [...new Array(Dimension.GRID_ROWS)].map(() => null),
      [...new Array(Dimension.GRID_ROWS)].map(() => null),
      [...new Array(Dimension.GRID_ROWS)].map(() => null),
      [...new Array(Dimension.GRID_ROWS)].map(() => null),
      [...new Array(Dimension.GRID_ROWS)].map(() => null),
    ],
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
