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
    const { start } = this.props;
    return (
      <Modal width="50%">
        <Title>LUMINES</Title>
        <Item onClick={start}>START</Item>
      </Modal>
    );
  }
}

export default GameMenu;
