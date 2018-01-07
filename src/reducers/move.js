import { ROTATE, MOVE, DROP } from '../actions';
import { rotateBlocks, canMove, moveCurrentX } from '../utils';
import { speeds } from '../constants';

const reducer = (state, action) => {
  switch (action.type) {
    case ROTATE:
      return {
        ...state,
        current: {
          ...state.current,
          blocks: rotateBlocks(state.current.blocks, action.direction),
        },
      };
    case MOVE:
      if (canMove(state.current, action.direction, state.grid)) {
        return {
          ...state,
          current: {
            ...state.current,
            x: moveCurrentX(state.current, action.direction),
          },
        };
      }
      return state;
    case DROP:
      return {
        ...state,
        current: {
          ...state.current,
          dropped: true,
          speed: speeds.DROP_FAST,
        },
      };
    default:
      return state;
  }
};

export default reducer;
