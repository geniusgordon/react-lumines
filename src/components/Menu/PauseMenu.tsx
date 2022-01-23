import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import { MenuProps } from './types';

export type PauseMenuProps = MenuProps & {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
};

const PauseMenu: React.FC<PauseMenuProps> = ({
  open,
  onClose,
  onResume,
  onRestart,
  onQuit,
}) => {
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
        <ListItem button onClick={onQuit}>
          <ListItemText primary="Quit" />
        </ListItem>
      </List>
    </Dialog>
  );
};

export default PauseMenu;
