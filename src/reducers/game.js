import { LOOP, LOCK } from '../actions';
import {
  range,
  generateRandomPiece,
  nextScanLineX,
  nextCurrentY,
} from '../utils';
import { dimensions, speeds } from '../constants';

const initialState = {
  scanLine: {
    x: 0,
    speed: speeds.SCAN_LINE_MEDIUM,
  },
  grid: range(dimensions.GRID_COLUMNS).map(() =>
    range(dimensions.GRID_ROWS).map(() => null),
  ),
  queue: range(3).map(() => generateRandomPiece()),
  current: {
    x: dimensions.SQUARE_SIZE * 7,
    y: 0,
    blocks: generateRandomPiece(),
    dropped: false,
  },
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case LOOP:
      return {
        ...state,
        scanLine: {
          ...state.scanLine,
          x: nextScanLineX(state.scanLine, action.elapsed),
        },
        current: {
          ...state.current,
          y: Math.min(
            nextCurrentY(state.current, action.elapsed),
            dimensions.GRID_HEIGHT - dimensions.SQUARE_SIZE * 2,
          ),
        },
      };
    case LOCK:
      return {
        ...state,
        current: {
          x: dimensions.SQUARE_SIZE * 7,
          y: 0,
          blocks: state.queue[0],
          dropped: false,
        },
        queue: [state.queue[1], state.queue[2], action.next],
      };
    default:
      return state;
  }
};

export default reducer;
