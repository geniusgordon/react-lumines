import { createStore } from 'redux';
import reducer from './reducers';
import decode from './actions/decode';

export default event => {
  const store = createStore(reducer);
  try {
    const actions = decode(event.data.replay);
  } catch (error) {
    console.log(error);
    return {
      error: "Can't decode replay",
    };
  }

  for (let i = 0; i < actions.length; i++) {
    try {
      store.dispatch(actions[i]);
    } catch (error) {
      return {
        error: `dispatch actions[${i}] error:
          state: ${JSON.stringify(store.getState())}

          action: ${JSON.stringify(actions[i])}
        `,
      };
    }
  }

  if (event.data.score > store.getState().score + 30) {
    console.log(`
      expected: ${store.getState().score}
      received: ${event.data.score}
    `);
    return {
      error: `Invalid score:
        expected: ${store.getState().score}
        received: ${event.data.score}
      `,
    };
  }
  return event;
};
