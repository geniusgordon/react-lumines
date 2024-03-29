import React from 'react';
import Game from '../components/Game';
import { usePlayGame } from '../hooks/use-game';
import useKeyDown from '../hooks/use-key-down';
import {
  MoveDirection,
  RotateDirection,
  GameState,
  ActionType,
} from '../game/types';
import { Key } from '../constants';
import { PauseMenu, GameOverMenu } from '../components/Menu';
import useDisclosure from '../hooks/use-disclosure';

const Play: React.FC = () => {
  const { game, dispatch, replay } = usePlayGame();
  const { open, onOpen, onClose } = useDisclosure();

  const handleRestart = React.useCallback(() => {
    dispatch({ type: ActionType.RESTART });
    onClose();
  }, [dispatch, onClose]);

  const handleResume = React.useCallback(() => {
    dispatch({ type: ActionType.RESUME });
    onClose();
  }, [dispatch, onClose]);

  const handleClose = React.useCallback(() => {
    dispatch({ type: ActionType.RESUME });
    onClose();
  }, [dispatch, onClose]);

  const handleKeyDown = React.useCallback(
    keyCode => {
      if (keyCode === Key.ESC) {
        dispatch({
          type:
            game.state === GameState.PLAY
              ? ActionType.PAUSE
              : ActionType.RESUME,
        });
        if (!open) {
          onOpen();
        }
        return;
      }
      if (keyCode === Key.R) {
        handleRestart();
        onClose();
        return;
      }
      if (game.state !== GameState.PLAY || game.time < 0) {
        return;
      }
      switch (keyCode) {
        case Key.LEFT:
          return dispatch({
            type: ActionType.MOVE,
            payload: MoveDirection.LEFT,
          });
        case Key.RIGHT:
          return dispatch({
            type: ActionType.MOVE,
            payload: MoveDirection.RIGHT,
          });
        case Key.Z:
          return dispatch({
            type: ActionType.ROTATE,
            payload: RotateDirection.CCW,
          });
        case Key.X:
          return dispatch({
            type: ActionType.ROTATE,
            payload: RotateDirection.CW,
          });
        case Key.DOWN:
        case Key.SPACE:
          return dispatch({ type: ActionType.DROP });
      }
    },
    [dispatch, game, open, onOpen, onClose, handleRestart],
  );

  useKeyDown(handleKeyDown);

  return (
    <React.StrictMode>
      <Game game={game} />
      <PauseMenu
        open={open}
        onClose={handleClose}
        onRestart={handleRestart}
        onResume={handleResume}
      />
      {replay && (
        <GameOverMenu
          open={game.state === GameState.OVER}
          replay={replay}
          onClose={handleClose}
          onRestart={handleRestart}
        />
      )}
    </React.StrictMode>
  );
};

export default Play;
