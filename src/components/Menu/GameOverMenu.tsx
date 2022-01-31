import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  List,
  ListItemButton,
  ListItemText,
  DialogTitle,
  Dialog,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { MenuProps } from './types';
import { serializeReplay } from '../../game/serializer';
import { Replay } from '../../game/types';
import useDisclosure from '../../hooks/use-disclosure';

export type GameOverMenuProps = MenuProps & {
  replay: Replay;
  onRestart: () => void;
};

const GameOverMenu: React.FC<GameOverMenuProps> = ({
  open,
  replay,
  onClose,
  onRestart,
}) => {
  const navigate = useNavigate();
  const handleBack = React.useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const shareSnackBar = useDisclosure();

  const handleShare = React.useCallback(() => {
    const dataStr = JSON.stringify(serializeReplay(replay));
    const url = `${window.location.host}/replay?data=${dataStr}`;
    navigator.clipboard.writeText(url);
    shareSnackBar.onOpen();
  }, [shareSnackBar, replay]);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Score: {replay.score}</DialogTitle>
      <List>
        <ListItemButton onClick={onRestart}>
          <ListItemText primary="Restart" />
        </ListItemButton>
        <ListItemButton onClick={handleBack}>
          <ListItemText primary="Back" />
        </ListItemButton>
      </List>
      <DialogActions>
        <Button variant="contained" onClick={handleShare}>
          Share
        </Button>
      </DialogActions>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        open={shareSnackBar.open}
        onClose={shareSnackBar.onClose}
        message="Copied to clipboard"
        autoHideDuration={3000}
      />
    </Dialog>
  );
};

export default GameOverMenu;
