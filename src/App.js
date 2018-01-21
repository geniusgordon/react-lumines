import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
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
    const { history, location, dispatch } = this.props;
    switch (e.keyCode) {
      case keys.ESC:
        dispatch(pause());
        break;
      case keys.R:
        history.push(`/refresh${location.pathname}`);
        break;
      default:
        break;
    }
  };
  resume = () => {
    const { gameState, dispatch } = this.props;
    if (gameState === gameStates.PAUSED) {
      dispatch(pause());
    }
  };
  quit = () => {
    this.props.history.push('/');
  };
  render() {
    const { gameState, score, location } = this.props;
    return (
      <Container>
        <Route path="/game" component={Game} />
        <Route path="/replay" component={Replay} />
        <GameMenu
          gameState={gameState}
          score={score}
          resume={this.resume}
          quit={this.quit}
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

export default withRouter(connect(mapStateToProps)(App));
