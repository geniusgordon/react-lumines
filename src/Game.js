import React, { Component } from 'react';
import { connect } from 'react-redux';
import Floor from './components/Floor';
import Grid from './components/Grid';
import Group from './components/Group';
import Piece from './components/Piece';
import ScanLine from './components/ScanLine';
import Queue from './components/Queue';
import { update, rotate, move, drop } from './actions';
import { dimensions, keys } from './constants';

class Game extends Component {
  componentDidMount() {
    this.start();
  }
  start = () => {
    window.addEventListener('keydown', this.handleKeyDown);
    this.time = performance.now();
    const tick = now => {
      const elapsed = (now - this.time) / 1000;
      this.time = now;
      this.props.dispatch(update(elapsed));
      this.requestId = requestAnimationFrame(tick);
    };
    this.requestId = requestAnimationFrame(tick);
  };
  stop = () => {
    window.removeEventListener('keydown', this.handleKeyDown);
    cancelAnimationFrame(this.requestId);
  };
  handleKeyDown = e => {
    const { dispatch } = this.props;
    switch (e.keyCode) {
      case keys.KEY_Z:
        dispatch(rotate(-1));
        break;
      case keys.KEY_X:
      case keys.KEY_UP:
        dispatch(rotate(1));
        break;
      case keys.KEY_LEFT:
        dispatch(move(-1));
        break;
      case keys.KEY_RIGHT:
        dispatch(move(1));
        break;
      case keys.KEY_DOWN:
      case keys.KEY_SPACE:
        dispatch(drop());
        break;
      default:
        break;
    }
  };
  render() {
    const PADDING = dimensions.SQUARE_SIZE / 2;
    const QUEUE_WIDTH = dimensions.SQUARE_SIZE * 2;
    const width =
      PADDING + QUEUE_WIDTH + PADDING + dimensions.GRID_WIDTH + PADDING;
    const height = PADDING + dimensions.GRID_HEIGHT + PADDING;
    const { queue, grid, current } = this.props;
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

const mapStateToProps = state => state;

export default connect(mapStateToProps)(Game);
