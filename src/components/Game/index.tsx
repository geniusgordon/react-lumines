import React from 'react';
import Group from '../Group';
import Block from '../Block';
import Queue from '../Queue';
import Field from '../Field';
import Grid from '../Grid';
import ScanLine from '../ScanLine';
import { Game as GameType } from '../../game/types';
import { Dimension as d } from '../../constants';

export type GameProps = {
  game: GameType;
};

const PADDING = d.SQUARE_SIZE / 2;
const QUEUE_WIDTH = d.SQUARE_SIZE * 2;
const INFO_PANEL_WIDTH = d.SQUARE_SIZE * 3;
const width =
  PADDING +
  QUEUE_WIDTH +
  PADDING +
  d.GRID_WIDTH +
  PADDING +
  INFO_PANEL_WIDTH +
  PADDING;
const height = PADDING + d.GRID_HEIGHT + PADDING;

const Game: React.FC<GameProps> = ({ game }) => {
  const { queue, grid, activeBlock, scanLine } = game;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Group x={PADDING} y={PADDING + d.SQUARE_SIZE * 2}>
        <Queue queue={queue} />
      </Group>
      <Group x={PADDING + QUEUE_WIDTH + PADDING} y={PADDING}>
        <Grid />
        <Field grid={grid} />
        <Block {...activeBlock} />
        <ScanLine {...scanLine} matchedCount={10} />
      </Group>
    </svg>
  );
};

export default Game;
