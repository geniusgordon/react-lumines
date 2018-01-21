import React, { Component } from 'react';
import { Route } from 'react-router';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
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

class GameMenu extends Component {
  renderMenu = ({ location: { pathname } }) => {
    const { gameState, score, resume, quit } = this.props;
    if (pathname === '/') {
      return (
        <Modal width="50%">
          <Title>LUMINES</Title>
          <LinkItem to="/game">START</LinkItem>
          <LinkItem to="/replay">REPLAY</LinkItem>
          <LinkItem to="/rank">RANK</LinkItem>
        </Modal>
      );
    }
    if (pathname === '/game' || pathname === '/replay') {
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
            <LinkItem to={`/refresh${pathname}`}>RESTART</LinkItem>
            <Item onClick={quit}>QUIT</Item>
          </Modal>
        );
      }
    }
    if (pathname === '/rank') {
      return (
        <Modal>
          <Item onClick={quit}>QUIT</Item>
        </Modal>
      );
    }
    return null;
  };
  render() {
    return <Route path="/" render={this.renderMenu} />;
  }
}

export default GameMenu;
