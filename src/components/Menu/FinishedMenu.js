import React, { Fragment } from 'react';
import Title from './Title';
import Item from './Item';
import Input, { InputGroup } from './Input';

const FinishedMenu = ({
  score,
  rankPosition,
  isGame,
  canSubmit,
  name,
  error,
  handleNameChange,
  submit,
  restart,
  quit,
}) => (
  <Fragment>
    <Title title={`Score: ${score}`} />
    <Item onClick={restart}>RESTART</Item>
    <Item onClick={quit}>QUIT</Item>
  </Fragment>
);

export default FinishedMenu;
