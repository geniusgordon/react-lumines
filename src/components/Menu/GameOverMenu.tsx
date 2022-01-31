import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItemButton,
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
        <ListItemButton onClick={onRestart}>
          <ListItemText primary="Restart" />
        </ListItemButton>
        <ListItemButton onClick={handleBack}>
          <ListItemText primary="Back" />
        </ListItemButton>
      </List>
    </Dialog>
  );
};

export default GameOverMenu;
