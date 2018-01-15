import React, { PureComponent } from 'react';
import styled from 'styled-components';
import Modal from './Modal';

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

class PausedMenu extends PureComponent {
  state = { selected: 0 };
  render() {
    const { resume, restart, quit } = this.props;
    return (
      <Modal>
        <Title>PAUSED</Title>
        <Item onClick={resume}>RESUME</Item>
        <Item onClick={restart}>RESTART</Item>
        <Item onClick={quit}>QUIT</Item>
      </Modal>
    );
  }
}

export default PausedMenu;
