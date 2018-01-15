import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { devToolsEnhancer } from 'redux-devtools-extension';
import App from './App';
import reducer from './reducers';
import { LOOP } from './actions';
import registerServiceWorker from './registerServiceWorker';
import './index.css';

const store = createStore(
  reducer,
  devToolsEnhancer({ actionsBlacklist: [LOOP] }),
);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root'),
);

registerServiceWorker();
