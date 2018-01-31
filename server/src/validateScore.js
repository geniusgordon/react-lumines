import { createStore } from 'redux';
import reducer from './reducers';
import decode from './actions/decode';

export default event => {
  const store = createStore(reducer);
  decode(event.data.replay).forEach(action => {
    store.dispatch(action);
  });
  if (event.data.score > store.getState().score + 30) {
    return {
      error: 'Invalid score',
    };
  }

  return event;
};
