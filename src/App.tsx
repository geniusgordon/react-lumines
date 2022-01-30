import React from 'react';
import GlobalStyles from '@mui/material/GlobalStyles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Home from './containers/Home';
import Play from './containers/Play';
import Replay from './containers/Replay';
import Ranking from './containers/Ranking';
import theme from './theme';
import { Palette } from './constants';
import useReplayManager, {
  ReplayManagerContext,
} from './hooks/use-replay-manager';

const styles = {
  padding: 0,
  margin: 0,
  width: '100%',
  height: '100%',
  backgroundColor: Palette.BACKGROUND,
};

function App() {
  const replayManager = useReplayManager();
  return (
    <ReplayManagerContext.Provider value={replayManager}>
      <ThemeProvider theme={theme}>
        <GlobalStyles
          styles={{
            html: styles,
            body: styles,
            '#root': styles,
          }}
        />
        <BrowserRouter basename="/react-lumines">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<Play />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/replay/:id" element={<Replay />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ReplayManagerContext.Provider>
  );
}

export default App;
