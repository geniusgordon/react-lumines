import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router';

import { ApolloProvider } from 'react-apollo';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

import ReactGA from 'react-ga';

import App from './App';
import reducer from './reducers';
import registerServiceWorker from './registerServiceWorker';
import withTracker from './withTracker';

import './index.css';

ReactGA.initialize('UA-68526607-8');
ReactGA.pageview(window.location.pathname);

const store = createStore(reducer);

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.graph.cool/simple/v1/cjcp0ad3x24sj0170nwuqzovd',
  }),
  cache: new InMemoryCache(),
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <Provider store={store}>
      <MemoryRouter>
        <Route component={withTracker(App)} />
      </MemoryRouter>
    </Provider>
  </ApolloProvider>,
  document.getElementById('root'),
);

registerServiceWorker();
