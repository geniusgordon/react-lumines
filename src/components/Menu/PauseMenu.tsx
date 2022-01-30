import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
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
        <ListItem button onClick={onResume}>
          <ListItemText primary="Resume" />
        </ListItem>
        <ListItem button onClick={onRestart}>
          <ListItemText primary="Restart" />
        </ListItem>
        <ListItem button onClick={handleBack}>
          <ListItemText primary="Back" />
        </ListItem>
      </List>
    </Dialog>
  );
};

export default PauseMenu;
