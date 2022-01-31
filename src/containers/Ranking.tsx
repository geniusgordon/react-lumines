import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Button,
} from '@mui/material';
import { ReplayManagerContext } from '../hooks/use-replay-manager';

function Ranking() {
  const { data } = React.useContext(ReplayManagerContext);
  const navigate = useNavigate();

  const ranking = React.useMemo(() => {
    return Object.values(data).sort((a, b) => b.score - a.score);
  }, [data]);

  const handleBack = React.useCallback(() => {
    navigate(-1);
  }, [navigate]);

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
        sx={{
          width: '100%',
          maxHeight: '90%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="h3" sx={{ textAlign: 'center', padding: 2 }}>
          Ranking
        </Typography>
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            padding: 2,
          }}
        >
          <List sx={{ marginBottom: 2 }}>
            {ranking.map(r => (
              <ListItemButton
                key={r.id}
                component={Link}
                to={`/replay/${r.id}`}
              >
                <ListItemText
                  primary={r.score.toString()}
                  secondary={r.timestamp
                    .toISOString()
                    .substr(0, 19)
                    .replace('T', ' ')}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
        <Button size="large" onClick={handleBack}>
          Back
        </Button>
      </Paper>
    </Container>
  );
}

export default Ranking;
