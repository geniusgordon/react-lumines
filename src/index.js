import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import Game from './Game';
import reducer from './reducers';
import registerServiceWorker from './registerServiceWorker';
import './index.css';

const store = createStore(reducer);

ReactDOM.render(
  <Provider store={store}>
    <Game />
  </Provider>,
  document.getElementById('root'),
);

registerServiceWorker();
