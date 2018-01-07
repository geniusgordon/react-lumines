import { ROTATE, MOVE, DROP } from '../actions';
import { dimensions, speeds } from '../constants';

const moveCurrentX = (current, direction) =>
  Math.max(
    Math.min(
      current.x + direction * dimensions.SQUARE_SIZE,
      dimensions.GRID_WIDTH - dimensions.SQUARE_SIZE * 2,
    ),
    0,
  );

const rotateBlocks = (blocks, direction) =>
  blocks.map((_, i) => blocks[(4 + i - direction) % 4]);

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
      return {
        ...state,
        current: {
          ...state.current,
          x: moveCurrentX(state.current, action.direction),
        },
      };
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
