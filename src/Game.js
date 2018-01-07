import React, { Component } from 'react';
import { connect } from 'react-redux';
import Interface from './components/Interface';
import {
  loop,
  rotate,
  move,
  drop,
  next,
  decompose,
  updateDetached,
} from './actions';
import { keys } from './constants';
import {
  nextBlockY,
  isFreeBelow,
  addToGrid,
  willCollide,
  willEnterNextRow,
} from './utils';

class Game extends Component {
  componentDidMount() {
    this.start();
  }
  start = () => {
    window.addEventListener('keydown', this.handleKeyDown);
    this.requestId = requestAnimationFrame(this.loop);
  };
  stop = () => {
    window.removeEventListener('keydown', this.handleKeyDown);
    cancelAnimationFrame(this.requestId);
  };
  loop = now => {
    if (!this.time) {
      this.time = now;
    }
    const elapsed = (now - this.time) / 1000;
    this.time = now;

    this.checkCurrent(elapsed);
    this.checkDetached(elapsed);

    this.props.dispatch(loop(elapsed));
    this.requestId = requestAnimationFrame(this.loop);
  };
  checkCurrent = elapsed => {
    const { current, grid, dispatch } = this.props;
    const nextY = { ...current, y: nextBlockY(current, elapsed) };
    if (current.dropped && willCollide(nextY, grid)) {
      dispatch(decompose(nextY));
      dispatch(next());
    } else if (
      willEnterNextRow(current, elapsed) &&
      willCollide(current, grid)
    ) {
      dispatch(decompose(current));
      dispatch(next());
    }
  };
  checkDetached = elapsed => {
    const { detached, dispatch } = this.props;
    let grid = this.props.grid;
    const newDetached = [];
    for (let i = 0; i < detached.length; i++) {
      const nextY = { ...detached[i], y: nextBlockY(detached[i], elapsed) };
      if (isFreeBelow(nextY, grid)) {
        newDetached.push(nextY);
      } else {
        grid = addToGrid(nextY, grid);
      }
    }
    dispatch(updateDetached(grid, newDetached));
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
    const { queue, grid, current, scanLine, detached } = this.props;
    return (
      <Interface
        queue={queue}
        grid={grid}
        current={current}
        scanLine={scanLine}
        detached={detached}
      />
    );
  }
}

const mapStateToProps = state => state;

export default connect(mapStateToProps)(Game);
