import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Snackbar,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import { ReplayManagerContext } from '../hooks/use-replay-manager';
import useShareReplay from '../hooks/use-share-replay';
import { Replay } from '../game/types';

function RankItem({ replay }: { replay: Replay }) {
  const { shareSnackBar, onShare } = useShareReplay(replay);
  return (
    <ListItem
      secondaryAction={
        <IconButton edge="end" aria-label="share" onClick={onShare}>
          <ShareIcon />
        </IconButton>
      }
      disablePadding
    >
      <ListItemButton
        role={undefined}
        component={Link}
        to={`/replay/${replay.id}`}
        dense
      >
        <ListItemText
          primary={replay.score.toString()}
          secondary={replay.timestamp
            .toISOString()
            .substr(0, 19)
            .replace('T', ' ')}
        />
      </ListItemButton>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        open={shareSnackBar.open}
        onClose={shareSnackBar.onClose}
        message="Copied to clipboard"
        autoHideDuration={3000}
      />
    </ListItem>
  );
}

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
          <List>
            {ranking.map(r => (
              <RankItem key={r.id} replay={r} />
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
