import React from 'react';
import { Link } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemText,
  DialogTitle,
  Dialog,
} from '@mui/material';
import { MenuProps } from './types';

export type GameOverMenuProps = MenuProps & {
  score: number;
  onRestart: () => void;
};

const GameOverMenu: React.FC<GameOverMenuProps> = ({
  open,
  score,
  onClose,
  onRestart,
}) => {
  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Score: {score}</DialogTitle>
      <List>
        <ListItem button onClick={onRestart}>
          <ListItemText primary="Restart" />
        </ListItem>
        <ListItem button component={Link} to="/">
          <ListItemText primary="Quit" />
        </ListItem>
      </List>
    </Dialog>
  );
};

export default GameOverMenu;
