import React from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/system';
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
import GithubLogoSrc from '../assets/github-logo.png';

const GithubLogo = styled('img')({
  width: 24,
  height: 24,
  filter: 'invert(100%)',
})

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
        flexDirection: 'column',
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
          <ListItem button component={Link} to="/ranking">
            <ListItemText primary="Ranking" />
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
      <Box
        component="a"
        href="https://github.com/geniusgordon/react-lumines"
        sx={{
          alignSelf: 'flex-end',
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          textDecoration: 'none',
          marginTop: 1,
        }}
      >
        <Typography sx={{ marginRight: 1 }}>open sourced in</Typography>
        <GithubLogo src={GithubLogoSrc} alt="github" />
      </Box>
    </Container>
  );
}

export default Home;
