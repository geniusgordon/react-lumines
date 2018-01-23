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
    <Title
      title={`Score: ${score}`}
      subtitle={isGame && rankPosition !== -1 && `rank ${rankPosition}`}
    />
    {isGame &&
      canSubmit && (
        <InputGroup>
          <Input
            value={name}
            error={error}
            placeholder="Enter Your Name"
            onChange={handleNameChange}
          />
          <Item onClick={submit}>Submit</Item>
        </InputGroup>
      )}
    <Item onClick={restart}>RESTART</Item>
    <Item onClick={quit}>QUIT</Item>
  </Fragment>
);

export default FinishedMenu;
