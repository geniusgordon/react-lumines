import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider } from '@mui/material/styles';
import Play from './containers/Play';
import theme from './theme';

const styles = {
  padding: 0,
  margin: 0,
  width: '100%',
  height: '100%',
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
      <Play />
    </ThemeProvider>
  );
}

export default App;
