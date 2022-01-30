import React from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ReplayManagerContext } from '../hooks/use-replay-manager';

function Ranking() {
  const { data } = React.useContext(ReplayManagerContext);

  const ranking = React.useMemo(() => {
    return Object.values(data).sort((a, b) => b.score - a.score);
  }, [data]);

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
      <Paper
        sx={{ width: '100%', maxHeight: '90%', padding: 2, overflow: 'auto' }}
      >
        <Typography variant="h3" sx={{ textAlign: 'center' }}>
          Ranking
        </Typography>
        <List sx={{ marginBottom: 2 }}>
          {ranking.map(r => (
            <ListItem key={r.id} button component={Link} to={`/replay/${r.id}`}>
              <ListItemText
                primary={r.score.toString()}
                secondary={r.timestamp
                  .toISOString()
                  .substr(0, 19)
                  .replace('T', ' ')}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

export default Ranking;
