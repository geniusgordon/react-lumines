import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Palette } from '../constants';

type DemoKeyProps = {
  keys: string[];
  description: string;
};

const DemoKey: React.FC<DemoKeyProps> = ({ keys, description }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
      {keys.map(k => (
        <Box
          key={k}
          sx={{
            height: 28,
            minWidth: 28,
            padding: 0.5,
            backgroundColor: Palette.BACKGROUND,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            marginRight: 1,
          }}
        >
          {k}
        </Box>
      ))}
      <Typography variant="caption">{description}</Typography>
    </Box>
  );
};

function Home() {
  return (
    <Container
      maxWidth="sm"
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ width: '100%', padding: 2 }}>
        <Typography variant="h3" sx={{ textAlign: 'center' }}>
          Lumines
        </Typography>
        <List sx={{ marginBottom: 2 }}>
          <ListItem button component={Link} to="/play">
            <ListItemText primary="Start" />
          </ListItem>
          <ListItem button>
            <ListItemText primary="Replay" />
          </ListItem>
        </List>
        <Box sx={{ display: 'flex' }}>
          <Box sx={{ flex: 1 }}>
            <DemoKey keys={['R']} description="Restart game" />
            <DemoKey keys={['Z']} description="Rotate left" />
            <DemoKey keys={['X', '↑']} description="Rotate right" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <DemoKey keys={['←']} description="Left" />
            <DemoKey keys={['→']} description="Right" />
            <DemoKey keys={['↓', 'Space']} description="Drop" />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default Home;
