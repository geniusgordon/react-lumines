import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';
import Interface from '../components/Interface';
import { loop, finish } from '../actions';
import { TIME_LIMIT, gameStates } from '../constants';
import decode from '../actions/decode.js';

class Replay extends Component {
  componentDidMount() {
    if (!this.props.data.loading) {
      this.start(this.props.data.Rank.replay);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.data.loading && !nextProps.data.loading) {
      this.start(nextProps.data.Rank.replay);
    }
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.requestId);
  }

  start = replay => {
    this.requestId = requestAnimationFrame(this.loop);
    this.replay = decode(replay);
    this.index = 1;
    this.props.dispatch(this.replay[0]);
  };

  loop = now => {
    const elapsed = Math.max(0, (now - this.props.now) / 1000);

    const { gameState, gameTime, dispatch } = this.props;
    if (gameState === gameStates.PLAYING && gameTime >= TIME_LIMIT) {
      dispatch(finish());
    }

    while (
      this.index < this.replay.length &&
      this.replay[this.index].time <= gameTime
    ) {
      try {
        dispatch(this.replay[this.index]);
      } catch (e) {
        console.log(this.props.detached, this.replay[this.index]);
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
      data,
    } = this.props;
    return data.loading ? null : (
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

const ReplayQuery = gql`
  query Replay($id: ID!) {
    Rank(id: $id) {
      id
      name
      replay
      score
    }
  }
`;

export default compose(
  connect(mapStateToProps),
  graphql(ReplayQuery, {
    options: props => ({ variables: { id: props.match.params.id } }),
  }),
)(Replay);
