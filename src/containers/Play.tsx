import React from 'react';
import Game from '../components/Game';
import useGame from '../hooks/use-game';
import useKeyDown from '../hooks/use-key-down';
import { RotateDirection, GameState } from '../game/types';
import { Dimension, Key } from '../constants';
import { PauseMenu, GameOverMenu } from '../components/Menu';
import useDisclosure from '../hooks/use-disclosure';
import useAnimationFrame from '../hooks/use-animation-frame';
import { Action, ActionType, ActionLog } from '../hooks/types';
import useInterval from '../hooks/use-interval';

const Play: React.FC = () => {
  const actionLogsRef = React.useRef<ActionLog[]>([]);
  const timeRef = React.useRef<number>(0);
  const { gameRef, dispatch: _dispatch } = useGame();
  const { open, onOpen, onClose } = useDisclosure();
  const [game, setGame] = React.useState(gameRef.current);

  React.useEffect(() => {
    timeRef.current = game.time;
  }, [game.time]);

  const dispatch = React.useCallback(
    (action: Action) => {
      if (
        action.type === ActionType.MOVE ||
        action.type === ActionType.ROTATE ||
        action.type === ActionType.DROP
      ) {
        actionLogsRef.current = [
          ...actionLogsRef.current,
          { action, timestamp: timeRef.current },
        ];
      }
      return _dispatch(action);
    },
    [_dispatch],
  );

  const handleQuit = React.useCallback(() => {}, []);

  const handleRestart = React.useCallback(() => {
    actionLogsRef.current = [];
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
            payload: -Dimension.SQUARE_SIZE,
          });
        case Key.RIGHT:
          return dispatch({
            type: ActionType.MOVE,
            payload: Dimension.SQUARE_SIZE,
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

  useInterval(
    elapsed => {
      dispatch({ type: ActionType.TICK, payload: elapsed });
    },
    game.state === GameState.PLAY ? 20 : 0,
  );

  useAnimationFrame(() => {
    setGame(gameRef.current);
  }, game.state === GameState.PLAY);

  return (
    <React.StrictMode>
      <Game game={game} />
      <PauseMenu
        open={open}
        onClose={handleClose}
        onQuit={handleQuit}
        onRestart={handleRestart}
        onResume={handleResume}
      />
      <GameOverMenu
        open={game.state === GameState.OVER}
        score={game.score}
        onClose={handleClose}
        onQuit={handleQuit}
        onRestart={handleRestart}
      />
    </React.StrictMode>
  );
};

export default Play;
