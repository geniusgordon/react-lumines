import React from 'react';
import Game from '../components/Game';
import useGame from '../hooks/use-game';

const Play: React.FC = () => {
  const { game } = useGame();

  return (
    <React.StrictMode>
      <Game game={game} />
    </React.StrictMode>
  );
};

export default Play;
