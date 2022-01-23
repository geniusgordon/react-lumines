import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import { MenuProps } from './types';

export type GameOverMenuProps = MenuProps & {
  score: number;
  onRestart: () => void;
  onQuit: () => void;
};

const GameOverMenu: React.FC<GameOverMenuProps> = ({
  open,
  score,
  onClose,
  onRestart,
  onQuit,
}) => {
  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Score: {score}</DialogTitle>
      <List>
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

export default GameOverMenu;
