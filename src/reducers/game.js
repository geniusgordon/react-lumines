import { LOOP, NEXT, DECOMPOSE, UPDATE_DETACHED } from '../actions';
import {
  range,
  generateRandomPiece,
  nextScanLineX,
  nextBlockY,
  addToGrid,
  decomposePiece,
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
    speed: speeds.DROP_SLOW,
  },
  detached: [],
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
          y: nextBlockY(state.current, action.elapsed),
        },
        detached: state.detached.map(block => ({
          ...block,
          y: nextBlockY(block, action.elapsed),
        })),
      };
    case NEXT:
      return {
        ...state,
        current: {
          x: dimensions.SQUARE_SIZE * 7,
          y: 0,
          blocks: state.queue[0],
          dropped: false,
          speed: speeds.DROP_SLOW,
        },
        queue: [state.queue[1], state.queue[2], action.colors],
      };
    case DECOMPOSE:
      const { decomposed, locked } = decomposePiece(action.blocks, state.grid);
      const grid = locked.reduce((g, b) => addToGrid(b, g), state.grid);
      return {
        ...state,
        grid,
        detached: [
          ...state.detached,
          ...decomposed.map(block => ({
            ...block,
            speed: speeds.DROP_DETACHED,
          })),
        ],
      };
    case UPDATE_DETACHED:
      return { ...state, grid: action.grid, detached: action.detached };
    default:
      return state;
  }
};

export default reducer;
