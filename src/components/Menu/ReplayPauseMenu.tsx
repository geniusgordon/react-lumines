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

export type PauseMenuProps = MenuProps & {
  replay: Replay;
  onResume: () => void;
  onRestart: () => void;
};

const ReplayPauseMenu: React.FC<PauseMenuProps> = ({
  replay,
  open,
  onClose,
  onResume,
  onRestart,
}) => {
  const navigate = useNavigate();
  const handleBack = React.useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const { shareSnackBar, onShare } = useShareReplay(replay);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Pause (Score: {replay.score})</DialogTitle>
      <List>
        <ListItem onClick={onResume}>
          <ListItemButton>
            <ListItemText primary="Resume" />
          </ListItemButton>
        </ListItem>
        <ListItem onClick={onRestart}>
          <ListItemButton>
            <ListItemText primary="Restart" />
          </ListItemButton>
        </ListItem>
        <ListItem onClick={handleBack}>
          <ListItemButton>
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

export default ReplayPauseMenu;
