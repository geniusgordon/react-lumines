import React, { Component } from 'react';
import { withRouter } from 'react-router';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import Modal from './Modal';
import { gameStates } from '../constants';

const Title = styled.div`
  padding: 16px;
  text-align: center;
  font-size: 36px;
  color: white;
`;

const Item = styled.div`
  text-align: center;
  padding: 8px;
  cursor: pointer;
  font-size: 24px;
  color: white;

  :hover {
    background-color: #424242;
  }
`;

const Padding = styled.div`
  text-align: center;
  padding: 8px;
  color: white;
`;

const LinkItem = styled(Link)`
  display: block;
  text-align: center;
  text-decoration: none;
  padding: 8px;
  cursor: pointer;
  font-size: 24px;
  color: white;

  :hover {
    background-color: #424242;
  }
`;

const InputGroup = styled.div`
  padding 8px;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  font-size: 24px;
  text-align: center;
  margin-bottom: 8px;
  padding: 8px 0;
  border: none;

  ${props =>
    props.error
      ? css`
          background-color: #ef9a9a;
          ::placeholder {
            color: white;
          }
        `
      : ''};
`;

const Loading = styled.div`
  text-align: center;
  color: white;
`;

const RankHeader = styled.div`
  display: flex;
  text-align: center;
  color: #9e9e9e;
  padding: 8px;
`;

const RankItem = LinkItem.extend`
  display: flex;
`;

const Rank = styled.div`
  width: 50px;
`;

const Name = styled.div`
  flex: 1;
  text-align: left;
  padding-left: 8px;
`;

const Score = styled.div`
  width: 50px;
  text-align: right;
`;

class GameMenu extends Component {
  state = { name: '', error: false };

  componentWillReceiveProps(nextProps) {
    const { data, location: { pathname } } = nextProps;
    if (
      data &&
      this.props.location.pathname !== '/rank' &&
      pathname === '/rank'
    ) {
      data.refetch();
    }
  }

  submit = () => {
    const { name } = this.state;
    if (name === '') {
      this.setState({ error: true });
    } else {
      this.props.submit(name);
    }
  };

  handleNameChange = event => {
    this.setState({ name: event.target.value });
  };

  render() {
    const {
      gameState,
      score,
      resume,
      quit,
      location: { pathname },
      data,
    } = this.props;
    const { name, error } = this.state;

    if (pathname === '/') {
      return (
        <Modal width="50%">
          <Title>LUMINES</Title>
          <LinkItem to="/game">START</LinkItem>
          <LinkItem to="/rank">RANK</LinkItem>
        </Modal>
      );
    }
    if (pathname === '/game' || pathname.startsWith('/replay')) {
      if (gameState === gameStates.PAUSED) {
        return (
          <Modal>
            <Title>PAUSED</Title>
            <Item onClick={resume}>RESUME</Item>
            <LinkItem to={`/refresh${pathname}`}>RESTART</LinkItem>
            <Item onClick={quit}>QUIT</Item>
          </Modal>
        );
      }
      if (gameState === gameStates.GAMEOVER) {
        return (
          <Modal>
            <Title>GAME OVER</Title>
            <LinkItem to={`/refresh${pathname}`}>RESTART</LinkItem>
            <Item onClick={quit}>QUIT</Item>
          </Modal>
        );
      }
      if (gameState === gameStates.FINISHED) {
        return (
          <Modal>
            <Title>Score: {score}</Title>
            {pathname === '/game' && (
              <InputGroup>
                <Input
                  value={name}
                  error={error}
                  placeholder="Enter Your Name"
                  onChange={this.handleNameChange}
                />
                <Item onClick={this.submit}>Submit</Item>
              </InputGroup>
            )}
            <LinkItem to={`/refresh${pathname}`}>RESTART</LinkItem>
            <Item onClick={quit}>QUIT</Item>
          </Modal>
        );
      }
    }
    if (pathname === '/rank') {
      return (
        <Modal>
          <RankHeader>
            <Rank>Rank</Rank>
            <Name>Name</Name>
            <Score>Score</Score>
          </RankHeader>
          {data.loading && <Loading>Loading</Loading>}
          {data &&
            data.allRanks.map((rank, index) => (
              <RankItem key={rank.id} to={`/replay/${rank.id}`}>
                <Rank>{index + 1}</Rank>
                <Name>{rank.name}</Name>
                <Score>{rank.score}</Score>
              </RankItem>
            ))}
          <Padding />
          <Item onClick={quit}>BACK</Item>
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

export default compose(withRouter, graphql(TopRanksQuery))(GameMenu);
