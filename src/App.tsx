import React from 'react';
import GlobalStyles from '@mui/material/GlobalStyles';
import Play from './containers/Play';

const styles = {
  padding: 0,
  margin: 0,
  width: '100%',
  height: '100%',
}

function App() {
  return (
    <React.Fragment>
      <GlobalStyles
        styles={{
          html: styles,
          body: styles,
          '#root': styles,
        }}
      />
      <Play />
    </React.Fragment>
  );
}

export default App;
