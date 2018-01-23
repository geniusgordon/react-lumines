import React, { Fragment } from 'react';
import styled from 'styled-components';
import Title from './Title';
import { LinkItem } from './Item';
import Keyboard from './Keyboard';
import githubLogo from '../../assets/GitHub-Mark-64px.png';

const Source = styled.a`
  position: absolute;
  right: 5px;
  bottom: 5px;
  height: 30px;
  line-height: 30px;
  color: white;
  text-decoration: none;
`;

const GithubLogo = styled.img`
  width: 30px;
  height: 30px;
  filter: invert(100%);
`;

const MainMenu = () => (
  <Fragment>
    <Title title="LUMINES" />
    <LinkItem to="/game">START</LinkItem>
    <LinkItem to="/rank">RANK</LinkItem>
    <Keyboard />
    <Source href="https://github.com/geniusgordon/react-lumines">
      open sourced in <GithubLogo src={githubLogo} />
    </Source>
  </Fragment>
);

export default MainMenu;
