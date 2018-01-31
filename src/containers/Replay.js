import React, { Component } from 'react';
import { createStore } from 'redux';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';
import styled from 'styled-components';
import Interface from '../components/Interface';
import Modal from '../components/Modal';
import { loop, finish } from '../actions';
import { TIME_LIMIT, gameStates } from '../constants';
import decode from '../actions/decode.js';
import reducer from '../reducers';

const Container = styled.div`
  height: 100%;
  width: 100%;
`;

class Replay extends Component {
  state = { scoreError: false };

  componentDidMount() {
    if (!this.props.data.loading) {
      this.start(this.props.data.Rank);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.data.loading && !nextProps.data.loading) {
      this.start(nextProps.data.Rank);
    }
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.requestId);
  }

  start = Rank => {
    const { dispatch } = this.props;
    this.requestId = requestAnimationFrame(this.loop);
    this.replay = decode(Rank.replay);
    this.index = 1;
    dispatch(this.replay[0]);
    const store = createStore(reducer);
    this.replay.forEach(action => {
      store.dispatch(action);
    });
    if (Rank.score > store.getState().score + 30) {
      this.setState({ scoreError: true });
    }
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
    const { scoreError } = this.state;
    return data.loading ? null : (
      <Container>
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
        {scoreError ? <Modal backgroundColor="#F44336" /> : null}
      </Container>
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
