import { FINISH } from './actions';
import encode from './actions/encode';

export const gameRecoder = store => next => {
  const actions = [];
  return action => {
    if (action.type.startsWith('GAME.') || action.type.startsWith('MOVE.')) {
      actions.push(action);
    }
    if (action.type === FINISH) {
      console.log(JSON.stringify(actions.map(encode)).length);
    }
    next(action);
  };
};
