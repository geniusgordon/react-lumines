import React, { Fragment } from 'react';
import Title from './Title';
import Item from './Item';

const PauseMenu = ({ resume, restart, quit }) => (
  <Fragment>
    <Title title="PAUSE" />
    <Item onClick={resume}>RESUME</Item>
    <Item onClick={restart}>RESTART</Item>
    <Item onClick={quit}>QUIT</Item>
  </Fragment>
);

export default PauseMenu;
