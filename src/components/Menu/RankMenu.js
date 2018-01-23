import React, { Fragment } from 'react';
import Item from './Item';
import { RankItem, RankHeader } from './Rank';
import Loading from './Loading';
import Padding from './Padding';

const RankMenu = ({ ranks, quit }) => (
  <Fragment>
    <RankHeader />
    {ranks.loading && ranks.allRanks.length === 0 && <Loading>Loading</Loading>}
    {ranks &&
      ranks.allRanks.map((rank, index) => (
        <RankItem
          key={rank.id}
          id={rank.id}
          rank={index + 1}
          name={rank.name}
          score={rank.score}
        />
      ))}
    <Padding />
    <Item onClick={quit}>BACK</Item>
  </Fragment>
);

export default RankMenu;
