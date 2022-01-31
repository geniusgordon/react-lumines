import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  DialogTitle,
  Dialog,
} from '@mui/material';
import { MenuProps } from './types';

export type PauseMenuProps = MenuProps & {
  onResume: () => void;
  onRestart: () => void;
};

const PauseMenu: React.FC<PauseMenuProps> = ({
  open,
  onClose,
  onResume,
  onRestart,
}) => {
  const navigate = useNavigate();
  const handleBack = React.useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Pause</DialogTitle>
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
    </Dialog>
  );
};

export default PauseMenu;
