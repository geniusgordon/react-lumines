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
  const navigate = useNavigate();
  const handleBack = React.useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Score: {score}</DialogTitle>
      <List>
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

export default GameOverMenu;
