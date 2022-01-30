import React from 'react';
import { useParams } from 'react-router-dom';
import { Typography } from '@mui/material';
import Game from '../components/Game';
import { useReplayGame } from '../hooks/use-game';
import useKeyDown from '../hooks/use-key-down';
import { GameState, ActionType, ActionLog } from '../game/types';
import { Key } from '../constants';
import { PauseMenu, GameOverMenu } from '../components/Menu';
import useDisclosure from '../hooks/use-disclosure';
import { ReplayManagerContext } from '../hooks/use-replay-manager';

type ReplayProps = {
  id: string;
  seed: string;
  actionLogs: ActionLog[];
};

const Replay: React.FC<ReplayProps> = props => {
  const { game, dispatch } = useReplayGame(props);
  const { open, onOpen, onClose } = useDisclosure();

  const handleRestart = React.useCallback(() => {
    dispatch({ type: ActionType.RESTART, payload: props });
    onClose();
  }, [dispatch, onClose, props]);

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
        onRestart={handleRestart}
        onResume={handleResume}
      />
      <GameOverMenu
        open={game.state === GameState.OVER}
        score={game.score}
        onClose={handleClose}
        onRestart={handleRestart}
      />
    </React.StrictMode>
  );
};

const ReplayContainer: React.FC = () => {
  const { id } = useParams();
  const { data } = React.useContext(ReplayManagerContext);

  if (!id || !data[id]) {
    return <Typography>Replay not found</Typography>;
  }

  const { seed, actionLogs } = data[id];

  return <Replay id={id} seed={seed} actionLogs={actionLogs} />;
};

export default ReplayContainer;
