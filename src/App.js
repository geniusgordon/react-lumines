import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';
import { Route } from 'react-router-dom';
import styled from 'styled-components';
import Game from './containers/Game';
import Replay from './containers/Replay';
import GameMenu from './components/GameMenu';
import Refresh from './components/Refresh';
import { pause } from './actions';
import { gameStates, keys } from './constants';

const Container = styled.div`
  width: 100%;
  height: 100%;
`;

class App extends Component {
  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = e => {
    const { gameState, history, location, dispatch } = this.props;
    if (e.keyCode === keys.ESC) {
      dispatch(pause());
    } else if (e.keyCode === keys.R && gameState === gameStates.PLAYING) {
      history.push(`/refresh${location.pathname}`);
    }
  };

  resume = () => {
    const { gameState, dispatch } = this.props;
    if (gameState === gameStates.PAUSED) {
      dispatch(pause());
    }
  };

  quit = () => {
    this.props.history.goBack();
  };

  submit = name => {
    const { score, replay, history, submitRank } = this.props;
    submitRank({ name, replay, score });
    history.goBack();
  };

  render() {
    const { gameState, score, location } = this.props;
    return (
      <Container>
        <Route path="/game" component={Game} />
        <Route path="/replay/:id" component={Replay} />
        <GameMenu
          gameState={gameState}
          score={score}
          resume={this.resume}
          quit={this.quit}
          submit={this.submit}
        />
        <Route
          path="/refresh"
          render={() => <Refresh path={location.pathname} />}
        />
      </Container>
    );
  }
}

const mapStateToProps = state => state;

const submitRankMutation = gql`
  mutation submitRank($name: String!, $replay: String!, $score: Int!) {
    createRank(name: $name, replay: $replay, score: $score) {
      id
    }
  }
`;

export default compose(
  withRouter,
  connect(mapStateToProps),
  graphql(submitRankMutation, {
    props: ({ mutate }) => ({
      submitRank: ({ name, replay, score }) =>
        mutate({ variables: { name, replay, score } }),
    }),
  }),
)(App);
