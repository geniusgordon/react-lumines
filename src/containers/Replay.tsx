import React from 'react';
import Game from '../components/Game';
import { useReplayGame } from '../hooks/use-game';
import useKeyDown from '../hooks/use-key-down';
import { GameState, ActionType, ActionLog } from '../game/types';
import { Key } from '../constants';
import { PauseMenu, GameOverMenu } from '../components/Menu';
import useDisclosure from '../hooks/use-disclosure';
import actionLogs from './action-logs';

const Play: React.FC = () => {
  const { game, dispatch } = useReplayGame({
    seed: '1',
    actionLogs: actionLogs as ActionLog[],
  });
  const { open, onOpen, onClose } = useDisclosure();

  const handleQuit = React.useCallback(() => {}, []);

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
