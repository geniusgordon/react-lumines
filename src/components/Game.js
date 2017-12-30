import React, { Component } from 'react';
import Piece from './Piece';
import Grid from './Grid';
import Group from './Group';
import { dimensions } from '../constants';

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
          <Piece x={10} y={20} blocks={[0, 1, 1, 0]} />
        </Group>
      </svg>
    );
  }
}

export default Game;
