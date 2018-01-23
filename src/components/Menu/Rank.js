import React from 'react';
import styled from 'styled-components';
import { LinkItem } from './Item';

const Rank = styled.div`
  width: 50px;
`;

const Name = styled.div`
  flex: 1;
  text-align: left;
  padding-left: 8px;
`;

const Score = styled.div`
  width: 50px;
  text-align: right;
`;

const Header = styled.div`
  display: flex;
  text-align: center;
  color: #9e9e9e;
  padding: 8px;
`;

const Item = LinkItem.extend`
  display: flex;
`;

const RankItem = ({ id, rank, name, score }) => (
  <Item to={`/replay/${id}`}>
    <Rank>{rank}</Rank>
    <Name>{name}</Name>
    <Score>{score}</Score>
  </Item>
);

const RankHeader = () => (
  <Header>
    <Rank>Rank</Rank>
    <Name>Name</Name>
    <Score>Score</Score>
  </Header>
);

export { RankItem, RankHeader };
