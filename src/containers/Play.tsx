import React from 'react';
import Game from '../components/Game';
import useGame from '../hooks/use-game';
import useKeyDown from '../hooks/use-key-down';
import { RotateDirection, GameState } from '../game/types';
import { Dimension, Key } from '../constants';

const Play: React.FC = () => {
  const { game, dispatch } = useGame();

  const handleKeyDown = React.useCallback(
    keyCode => {
      if (keyCode === Key.ESC) {
        return dispatch({ type: 'pause' });
      }
      if (game.state !== GameState.PLAY) {
        return;
      }
      switch (keyCode) {
        case Key.LEFT:
          return dispatch({ type: 'move', payload: -Dimension.SQUARE_SIZE });
        case Key.RIGHT:
          return dispatch({ type: 'move', payload: Dimension.SQUARE_SIZE });
        case Key.Z:
          return dispatch({ type: 'rotate', payload: RotateDirection.CCW });
        case Key.X:
          return dispatch({ type: 'rotate', payload: RotateDirection.CW });
        case Key.DOWN:
        case Key.SPACE:
          return dispatch({ type: 'drop' });
      }
    },
    [dispatch, game],
  );

  useKeyDown(handleKeyDown);

  return (
    <React.StrictMode>
      <Game game={game} />
    </React.StrictMode>
  );
};

export default Play;
