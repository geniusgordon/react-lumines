import React, { Component } from 'react';
import Floor from './Floor';
import Grid from './Grid';
import Group from './Group';
import Piece from './Piece';
import ScanLine from './ScanLine';
import Queue from './Queue';
import DetachedBlocks from './DetachedBlocks';
import Countdown from './Countdown';
import InfoPanel from './InfoPanel';
import { dimensions as d } from '../constants';

class Interface extends Component {
  render() {
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
    const {
      queue,
      grid,
      current,
      scanLine,
      detached,
      scanned,
      gameTime,
      score,
    } = this.props;
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Group x={PADDING} y={PADDING + d.SQUARE_SIZE * 2}>
          <Queue queue={queue} />
        </Group>
        <Group x={PADDING + QUEUE_WIDTH + PADDING} y={PADDING}>
          <Grid />
          <Floor grid={grid} />
          <Piece
            x={current.x}
            y={Math.min(current.y, d.GRID_HEIGHT - d.SQUARE_SIZE * 2)}
            blocks={current.blocks}
            dropped={current.dropped}
          />
          <DetachedBlocks blocks={detached} />
          <ScanLine x={scanLine.x} scanned={scanned} />
        </Group>
        <Group
          x={PADDING + QUEUE_WIDTH + PADDING + d.GRID_WIDTH + PADDING}
          y={PADDING + d.SQUARE_SIZE * 2}
        >
          <InfoPanel time={gameTime} score={score} />
        </Group>
        <Countdown
          x={width / 2 - d.SQUARE_SIZE * 1.5}
          y={d.SQUARE_SIZE * 7}
          time={gameTime}
        />
      </svg>
    );
  }
}

export default Interface;
