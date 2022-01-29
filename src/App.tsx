import GlobalStyles from '@mui/material/GlobalStyles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Home from './containers/Home';
import Play from './containers/Play';
import Replay from './containers/Replay';
import theme from './theme';
import { Palette } from './constants';

const styles = {
  padding: 0,
  margin: 0,
  width: '100%',
  height: '100%',
  backgroundColor: Palette.BACKGROUND,
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          html: styles,
          body: styles,
          '#root': styles,
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/replay/:id" element={<Replay />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
