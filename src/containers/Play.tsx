import React from 'react';
import Game from '../components/Game';
import useGame from '../hooks/use-game';

const Play: React.FC = () => {
  const { game } = useGame();

  return <Game game={game} />;
};

export default Play;
