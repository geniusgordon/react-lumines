import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  DialogTitle,
  Dialog,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { MenuProps } from './types';
import { Replay } from '../../game/types';
import useShareReplay from '../../hooks/use-share-replay';

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

  const { shareSnackBar, onShare } = useShareReplay(replay);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Score: {replay.score}</DialogTitle>
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={onRestart}>
            <ListItemText primary="Restart" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleBack}>
            <ListItemText primary="Back" />
          </ListItemButton>
        </ListItem>
      </List>
      <DialogActions>
        <Button variant="contained" onClick={onShare}>
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
