import React, { Component } from 'react';
import { connect } from 'react-redux';
import Interface from '../components/Interface';
import { loop, finish } from '../actions';
import { TIME_LIMIT, gameStates } from '../constants';
import decode from '../actions/decode.js';

class Replay extends Component {
  componentDidMount() {
    this.requestId = requestAnimationFrame(this.loop);
    this.log = decode(this.props.log);
    this.index = 1;
    this.props.dispatch(this.log[0]);
    console.log(this.log);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.requestId);
  }
  loop = now => {
    const elapsed = Math.max(0, (now - this.props.now) / 1000);

    const { gameState, gameTime, dispatch } = this.props;
    if (gameState === gameStates.PLAYING && gameTime >= TIME_LIMIT) {
      dispatch(finish());
    }

    while (
      this.index < this.log.length &&
      this.log[this.index].time <= gameTime
    ) {
      try {
        dispatch(this.log[this.index]);
      } catch (e) {
        console.log(this.props.detached, this.log[this.index]);
      }
      this.index++;
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
