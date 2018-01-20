import React, { Component } from 'react';
import { connect } from 'react-redux';
import Interface from '../components/Interface';
import {
  loop,
  finish,
  rotate,
  move,
  drop,
  decompose,
  next,
  lockDetached,
  scan,
  updateMatched,
  removeScanned,
} from '../actions';
import {
  xToCol,
  nextBlockY,
  isFreeBelow,
  addToGrid,
  willCollide,
  willEnterNextRow,
  willEnterNextColumn,
  decomposePiece,
} from '../utils';
import { gameStates, dimensions, keys } from '../constants';

class Replay extends Component {
  componentDidMount() {
    this.requestId = requestAnimationFrame(this.loop);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.requestId);
  }
  loop = now => {
    const elapsed = Math.max(0, (now - this.props.now) / 1000);

    const { gameState, gameTime, scanLine, dispatch } = this.props;
    if (gameState === gameStates.PLAYING && gameTime >= 90) {
      dispatch(finish());
    }

    dispatch(loop(now, elapsed));
    this.requestId = requestAnimationFrame(this.loop);
  };
  render() {
    const {
      queue,
      grid,
      current,
      scanLine,
      detached,
      scannedUtilNow,
      gameTime,
      score,
    } = this.props;
    return (
      <Interface
        queue={queue}
        grid={grid}
        current={current}
        scanLine={scanLine}
        detached={detached}
        scanned={scannedUtilNow}
        gameTime={gameTime}
        score={score}
      />
    );
  }
}

const mapStateToProps = state => state;

export default connect(mapStateToProps)(Replay);
