import React, { Component } from 'react';
import Floor from './Floor';
import Grid from './Grid';
import Group from './Group';
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

class Game extends Component {
  render() {
    const width =
      dimensions.PADDING + dimensions.GRID_WIDTH + dimensions.PADDING;
    const height =
      dimensions.PADDING + dimensions.GRID_HEIGHT + dimensions.PADDING;
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Group x={dimensions.PADDING}>
          <Grid />
          <Floor grid={grid} />
        </Group>
      </svg>
    );
  }
}

export default Game;
