import React, { Component } from 'react';
import Floor from './Floor';
import Grid from './Grid';
import Group from './Group';
import ScanLine from './ScanLine';
import Queue from './Queue';
import { dimensions } from '../constants';

const grid = [
  [],
  [{ color: 1, x: 10, y: 100 }, { color: 0, x: 10, y: 110 }],
  [{ color: 0, x: 20, y: 100 }, { color: 1, x: 20, y: 110 }],
  [
    { color: 1, x: 40, y: 80, matched: true, scanned: true },
    { color: 1, x: 40, y: 90, scanned: true },
    { color: 0, x: 40, y: 100, matched: true, scanned: true },
    { color: 0, x: 40, y: 110, scanned: true },
  ],
  [
    { color: 1, x: 50, y: 80 },
    { color: 1, x: 50, y: 90 },
    { color: 0, x: 50, y: 100, matched: true },
    { color: 0, x: 50, y: 110 },
  ],
  [{ color: 0, x: 60, y: 100, matched: true }, { color: 0, x: 60, y: 110 }],
  [{ color: 0, x: 70, y: 100 }, { color: 0, x: 70, y: 110 }],
];

const queue = [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 1]];

class Game extends Component {
  render() {
    const PADDING = dimensions.SQUARE_SIZE / 2;
    const QUEUE_WIDTH = dimensions.SQUARE_SIZE * 2;
    const width =
      PADDING + QUEUE_WIDTH + PADDING + dimensions.GRID_WIDTH + PADDING;
    const height = PADDING + dimensions.GRID_HEIGHT + PADDING;
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Group x={PADDING} y={dimensions.SQUARE_SIZE * 2}>
          <Queue queue={queue} />
        </Group>
        <Group x={PADDING + QUEUE_WIDTH + PADDING}>
          <Grid />
          <Floor grid={grid} />
          <ScanLine />
        </Group>
      </svg>
    );
  }
}

export default Game;
