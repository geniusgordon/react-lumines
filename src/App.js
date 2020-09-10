import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { compose } from 'react-apollo';
import { Route } from 'react-router-dom';
import styled from 'styled-components';
import Game from './containers/Game';
import Replay from './containers/Replay';
import Menu from './components/Menu';
import Refresh from './components/Refresh';
import { pause } from './actions';
import { gameStates, keys } from './constants';

const Container = styled.div`
  width: 100%;
  height: 100%;
`;

const Blur = styled.div`
  width: 100%;
  height: 100%;
  filter: blur(3px);
`;

class App extends Component {
  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = e => {
    const { gameState, dispatch } = this.props;
    if (e.keyCode === keys.ESC) {
      dispatch(pause());
    } else if (e.keyCode === keys.R) {
      if (gameState !== gameStates.FINISHED) {
        this.restart();
      }
    }
  };

  resume = () => {
    const { gameState, dispatch } = this.props;
    if (gameState === gameStates.PAUSED) {
      dispatch(pause());
    }
  };

  restart = () => {
    const { location: { pathname }, history } = this.props;
    history.replace(`/refresh${pathname}`);
  };

  quit = () => {
    this.props.history.goBack();
  };

  render() {
    const { gameState, score, location, data } = this.props;
    return (
      <Container>
        <Route path="/game" component={Game} />
        <Route path="/replay/:id" component={Replay} />
        <Menu
          gameState={gameState}
          score={score}
          resume={this.resume}
          restart={this.restart}
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

export default compose(withRouter, connect(mapStateToProps))(App);
