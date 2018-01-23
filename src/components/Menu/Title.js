import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 16px;
  text-align: center;
`;

const TitleText = styled.div`
  font-size: 36px;
  color: white;
`;

const SubtitleText = styled.div`
  font-size: 16px;
  color: #9e9e9e;
`;

const Title = ({ title = '', subtitle }) => (
  <Container>
    <TitleText>{title}</TitleText>
    {subtitle && <SubtitleText>{subtitle}</SubtitleText>}
  </Container>
);

export default Title;
