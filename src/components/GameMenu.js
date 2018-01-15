import React, { PureComponent } from 'react';
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

class GameMenu extends PureComponent {
  render() {
    const { gameState, score, resume, restart, quit } = this.props;
    if (gameState === gameStates.PAUSED) {
      return (
        <Modal>
          <Title>PAUSED</Title>
          <Item onClick={resume}>RESUME</Item>
          <Item onClick={restart}>RESTART</Item>
          <Item onClick={quit}>QUIT</Item>
        </Modal>
      );
    }
    if (gameState === gameStates.GAMEOVER) {
      return (
        <Modal>
          <Title>GAME OVER</Title>
          <Item onClick={restart}>RESTART</Item>
          <Item onClick={quit}>QUIT</Item>
        </Modal>
      );
    }
    if (gameState === gameStates.FINISHED) {
      return (
        <Modal>
          <Title>Score: {score}</Title>
          <Item onClick={restart}>RESTART</Item>
          <Item onClick={quit}>QUIT</Item>
        </Modal>
      );
    }
    return null;
  }
}

export default GameMenu;
