import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { composeWithDevTools } from 'redux-devtools-extension';
import App from './App';
import reducer from './reducers';
import { LOOP } from './actions';
import { gameRecoder } from './middlewares';
import registerServiceWorker from './registerServiceWorker';
import './index.css';

const composeEnhancers = composeWithDevTools({
  actionsBlacklist: [LOOP],
});

const store = createStore(
  reducer,
  composeEnhancers(applyMiddleware(gameRecoder)),
);

ReactDOM.render(
  <Provider store={store}>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </Provider>,
  document.getElementById('root'),
);

registerServiceWorker();
