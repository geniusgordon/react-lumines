import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import Game from './containers/Game';
import PausedMenu from './components/PausedMenu';
import { pause, restart, quit } from './actions';
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
    this.props.dispatch(quit());
  };
  render() {
    const { gameState } = this.props;
    return (
      <Container>
        <Game />
        {gameState === gameStates.PAUSED ? (
          <PausedMenu
            resume={this.resume}
            restart={this.restart}
            quit={this.quit}
          />
        ) : null}
      </Container>
    );
  }
}

const mapStateToProps = state => state;

export default connect(mapStateToProps)(App);
