import { LOOP, NEXT, UPDATE_DETACHED, UPDATE_GRID } from '../actions';
import {
  range,
  generateRandomPiece,
  nextScanLineX,
  nextBlockY,
} from '../utils';
import { dimensions, speeds } from '../constants';

const initialState = {
  now: performance.now(),
  scanLine: {
    x: 0,
    speed: speeds.SCAN_LINE_MEDIUM,
  },
  queue: range(3).map(() => generateRandomPiece()),
  grid: range(dimensions.GRID_COLUMNS).map(() =>
    range(dimensions.GRID_ROWS).map(() => null),
  ),
  current: {
    x: dimensions.SQUARE_SIZE * 7,
    y: 0,
    blocks: generateRandomPiece(),
    dropped: false,
    speed: speeds.DROP_SLOW,
  },
  detached: [],
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case LOOP:
      return {
        ...state,
        now: action.now,
        scanLine: {
          ...state.scanLine,
          x: nextScanLineX(state.scanLine, action.elapsed),
        },
        current: {
          ...state.current,
          y: nextBlockY(state.current, action.elapsed),
        },
        detached: state.detached.map(block => ({
          ...block,
          y: nextBlockY(block, action.elapsed),
        })),
      };
    case NEXT:
      const { queue } = state;
      return {
        ...state,
        current: {
          x: dimensions.SQUARE_SIZE * 7,
          y: 0,
          blocks: queue[0],
          dropped: false,
          speed: speeds.DROP_SLOW,
        },
        queue: [queue[1], queue[2], action.next],
      };
    case UPDATE_DETACHED:
      return { ...state, detached: action.detached };
    case UPDATE_GRID:
      return { ...state, grid: action.grid };
    default:
      return state;
  }
};

export default reducer;
