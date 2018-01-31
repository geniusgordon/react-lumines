import React, { Component } from 'react';
import { withRouter } from 'react-router';
import { compose, graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';
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

  componentDidMount() {
    this.queryRankPosition(100);
  }

  componentWillReceiveProps(nextProps) {
    const { gameState, score, ranks, location: { pathname } } = nextProps;
    if (
      ranks &&
      this.props.location.pathname !== '/rank' &&
      pathname === '/rank'
    ) {
      ranks.refetch();
    }

    if (
      this.props.gameState !== gameStates.FINISHED &&
      gameState === gameStates.FINISHED
    ) {
      this.setState({ canSubmit: true });
      this.queryRankPosition(score);
    }
  }

  submit = () => {
    const { name, canSubmit } = this.state;
    if (!canSubmit) {
      return;
    }

    if (name === '') {
      this.setState({ error: true });
    } else {
      this.setState({ canSubmit: false });
      this.props.submit(name);
    }
  };

  quit = () => {
    this.setState({ rankPosition: -1 });
    this.props.quit();
  };

  queryRankPosition = async score => {
    this.setState({ rankPosition: -1 });
    const res = await this.props.client.query({
      query: RankPositionQuery,
      variables: { score },
    });
    this.setState({ rankPosition: res.data._allRanksMeta.count + 1 });
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

const TopRanksQuery = gql`
  query TopRanks {
    allRanks(orderBy: score_DESC, first: 10) {
      id
      name
      score
    }
  }
`;

const RankPositionQuery = gql`
  query RankPosition($score: Int) {
    _allRanksMeta(filter: { score_gte: $score }) {
      count
    }
  }
`;

export default compose(
  withRouter,
  withApollo,
  graphql(TopRanksQuery, { name: 'ranks' }),
)(Menu);
