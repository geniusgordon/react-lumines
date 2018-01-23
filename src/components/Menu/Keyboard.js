import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  margin-top: 32px;
  display: flex;
  justify-content: center;
`;

const Column = styled.div`
  margin: 0 8px;
`;

const Row = styled.div`
  display: flex;
  margin-bottom: 8px;
`;

const Key = styled.div`
  display: flex;
  min-width: 30px;
  height: 30px;
  padding: 4px;
  border-radius: 5px;
  align-items: center;
  justify-content: center;
  background-color: #9e9e9e;
  margin-right: 8px;
`;

const Usage = styled.div`
  height: 30px;
  line-height: 30px;
  color: #9e9e9e;
`;

const Keyboard = () => (
  <Container>
    <Column>
      <Row>
        <Key>R</Key>
        <Usage>restart game</Usage>
      </Row>
      <Row>
        <Key>Z</Key>
        <Usage>rotate left</Usage>
      </Row>
      <Row>
        <Key>X</Key>
        <Key>↑ </Key>
        <Usage>rotate right</Usage>
      </Row>
    </Column>
    <Column>
      <Row>
        <Key>← </Key>
        <Usage>left</Usage>
      </Row>
      <Row>
        <Key> →</Key>
        <Usage>right</Usage>
      </Row>
      <Row>
        <Key>↓</Key>
        <Key>Space</Key>
        <Usage>drop</Usage>
      </Row>
    </Column>
  </Container>
);

export default Keyboard;
