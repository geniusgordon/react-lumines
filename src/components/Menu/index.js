import React, { Component } from 'react';
import { withRouter } from 'react-router';
import { compose, withApollo } from 'react-apollo';
import Modal from '../Modal';
import MainMenu from './MainMenu';
import PauseMenu from './PauseMenu';
import FinishedMenu from './FinishedMenu';
import GameOverMenu from './GameOverMenu';
import RankMenu from './RankMenu';
import { gameStates } from '../../constants';

class Menu extends Component {
  state = {
    name: '',
    error: false,
    canSubmit: false,
    rankPosition: -1,
  };

  quit = () => {
    this.setState({ rankPosition: -1 });
    this.props.quit();
  };

  handleNameChange = event => {
    this.setState({ name: event.target.value });
  };

  render() {
    const {
      score,
      resume,
      restart,
      gameState,
      ranks,
      location: { pathname },
    } = this.props;
    const { name, error, rankPosition, canSubmit } = this.state;

    if (pathname === '/') {
      return (
        <Modal width="50%">
          <MainMenu />
        </Modal>
      );
    }
    if (pathname === '/game' || pathname.startsWith('/replay')) {
      if (gameState === gameStates.PAUSED) {
        return (
          <Modal>
            <PauseMenu resume={resume} restart={restart} quit={this.quit} />
          </Modal>
        );
      }
      if (gameState === gameStates.GAMEOVER) {
        return (
          <Modal>
            <GameOverMenu restart={restart} quit={this.quit} />
          </Modal>
        );
      }
      if (gameState === gameStates.FINISHED) {
        return (
          <Modal>
            <FinishedMenu
              score={score}
              rankPosition={rankPosition}
              isGame={pathname === '/game'}
              name={name}
              error={error}
              canSubmit={canSubmit}
              restart={restart}
              quit={this.quit}
              submit={this.submit}
              handleNameChange={this.handleNameChange}
            />
          </Modal>
        );
      }
    }
    if (pathname === '/rank') {
      return (
        <Modal>
          <RankMenu ranks={ranks} quit={this.quit} />
        </Modal>
      );
    }
    return null;
  }
}

export default compose(withRouter)(Menu);
