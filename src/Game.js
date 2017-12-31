import React, { Component } from 'react';
import { connect } from 'react-redux';
import Interface from './components/Interface';
import { loop, rotate, move, drop, lock } from './actions';
import { keys } from './constants';
import { willLock } from './utils';

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

    const { current, grid, dispatch } = this.props;
    if (willLock(current, grid, elapsed)) {
      dispatch(lock());
    }

    dispatch(loop(elapsed));
    this.requestId = requestAnimationFrame(this.loop);
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
    const { queue, grid, current, scanLine } = this.props;
    return (
      <Interface
        queue={queue}
        grid={grid}
        current={current}
        scanLine={scanLine}
      />
    );
  }
}

const mapStateToProps = state => state;

export default connect(mapStateToProps)(Game);
