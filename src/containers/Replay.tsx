import React from 'react';
import Game from '../components/Game';
import useGame from '../hooks/use-game';
import useKeyDown from '../hooks/use-key-down';
import { GameState, Action, ActionType } from '../game/types';
import { Key } from '../constants';
import { PauseMenu, GameOverMenu } from '../components/Menu';
import useDisclosure from '../hooks/use-disclosure';
import useAnimationFrame from '../hooks/use-animation-frame';
import actionLogs from './action-logs';
import useInterval from '../hooks/use-interval';

const Play: React.FC = () => {
  const replayIndexRef = React.useRef<number>(0);
  const { game, dispatch } = useGame();
  const { open, onOpen, onClose } = useDisclosure();

  const handleQuit = React.useCallback(() => {}, []);

  const handleRestart = React.useCallback(() => {
    replayIndexRef.current = 0;
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
    },
    [dispatch, game, open, onOpen, onClose, handleRestart],
  );

  useKeyDown(handleKeyDown);

  useInterval(
    elapsed => {
      while (
        replayIndexRef.current < actionLogs.length &&
        actionLogs[replayIndexRef.current].timestamp <= game.time
      ) {
        dispatch(actionLogs[replayIndexRef.current].action as Action);
        replayIndexRef.current++;
      }
      dispatch({ type: ActionType.TICK, payload: elapsed });
    },
    game.state === GameState.PLAY ? 20 : 0,
  );

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
