import { RESTART, FINISH, record } from './actions';
import encode from './actions/encode';

export const gameRecoder = store => next => {
  let actions = [];
  return action => {
    if (action.type === RESTART) {
      actions = [action];
    }
    if (action.type.startsWith('GAME.') || action.type.startsWith('MOVE.')) {
      actions.push({ ...action, time: store.getState().gameTime });
    }
    if (action.type === FINISH) {
      store.dispatch(record(actions.map(encode).join(' ')));
    }
    next(action);
  };
};
