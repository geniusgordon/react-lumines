import React, { Component } from 'react';
import Floor from './Floor';
import Grid from './Grid';
import Group from './Group';
import Piece from './Piece';
import ScanLine from './ScanLine';
import Queue from './Queue';
import { dimensions } from '../constants';

class Interface extends Component {
  render() {
    const PADDING = dimensions.SQUARE_SIZE / 2;
    const QUEUE_WIDTH = dimensions.SQUARE_SIZE * 2;
    const width =
      PADDING + QUEUE_WIDTH + PADDING + dimensions.GRID_WIDTH + PADDING;
    const height = PADDING + dimensions.GRID_HEIGHT + PADDING;
    const { queue, grid, current, scanLine } = this.props;
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Group x={PADDING} y={dimensions.SQUARE_SIZE * 2}>
          <Queue queue={queue} />
        </Group>
        <Group x={PADDING + QUEUE_WIDTH + PADDING}>
          <Grid />
          <Floor grid={grid} />
          <Piece
            x={current.x}
            y={current.y}
            blocks={current.blocks}
            dropped={current.dropped}
          />
        </Group>
      </svg>
    );
  }
}

export default Interface;
