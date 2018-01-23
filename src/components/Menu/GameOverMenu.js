import React, { Fragment } from 'react';
import Title from './Title';
import Item from './Item';

const GameOverMenu = ({ restart, quit }) => (
  <Fragment>
    <Title title="GAME OVER" />
    <Item onClick={restart}>RESTART</Item>
    <Item onClick={quit}>QUIT</Item>
  </Fragment>
);

export default GameOverMenu;
