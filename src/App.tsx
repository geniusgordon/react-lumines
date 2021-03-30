import React from 'react';
import { createGlobalStyle } from 'styled-components';
import Play from './containers/Play';

const GlobalStyle = createGlobalStyle`
  html, body, #root {
    padding: 0;
    margin: 0;
    width: 100%;
    height: 100%;
  }
`;

function App() {
  return (
    <React.Fragment>
      <GlobalStyle />
      <Play />
    </React.Fragment>
  );
}

export default App;
