import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { Route } from 'react-router-dom';
import styled from 'styled-components';
import Game from './containers/Game';
import Replay from './containers/Replay';
import MainMenu from './components/MainMenu';
import GameMenu from './components/GameMenu';
import { pause, restart } from './actions';
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
    const { dispatch } = this.props;
    switch (e.keyCode) {
      case keys.ESC:
        dispatch(pause());
        break;
      case keys.R:
        dispatch(restart());
        break;
      default:
        break;
    }
  };
  start = () => {
    this.props.history.push('/game');
  };
  resume = () => {
    const { gameState, dispatch } = this.props;
    if (gameState === gameStates.PAUSED) {
      dispatch(pause());
    }
  };
  restart = () => {
    this.props.dispatch(restart());
  };
  quit = () => {
    this.props.history.goBack();
  };
  render() {
    const { gameState, score, match } = this.props;
    return (
      <Container>
        <Route path="/game" component={Game} />
        <Route path="/replay" component={Replay} />
        <Route
          path="/"
          render={({ location }) =>
            location.pathname === '/' ? (
              <MainMenu start={this.start} />
            ) : (
              <GameMenu
                gameState={gameState}
                score={score}
                resume={this.resume}
                restart={this.restart}
                quit={this.quit}
              />
            )
          }
        />
      </Container>
    );
  }
}

const mapStateToProps = state => state;

export default withRouter(connect(mapStateToProps)(App));
