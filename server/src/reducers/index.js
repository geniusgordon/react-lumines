import reduceReducers from './reduce-reducers';
import game from './game';
import move from './move';

const rootReducer = reduceReducers(game, move);

export default rootReducer;
