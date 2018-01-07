import { LOOP } from '../actions';
import {
  range,
  generateRandomPiece,
  nextScanLineX,
  nextBlockY,
  isFreeBelow,
  addToGrid,
  willCollide,
  willEnterNextRow,
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
  if (action.type === LOOP) {
    const { elapsed } = action;
    let { grid, queue } = state;
    const scanLine = {
      ...state.scanLine,
      x: nextScanLineX(state.scanLine, elapsed),
    };
    let current = {
      ...state.current,
      y: nextBlockY(state.current, elapsed),
    };
    let detached = state.detached.map(block => ({
      ...block,
      y: nextBlockY(block, elapsed),
    }));
    if (
      (current.dropped && willCollide(current, grid)) ||
      (willEnterNextRow(current, elapsed) && willCollide(current, grid))
    ) {
      const { decomposed, locked } = decomposePiece(current, grid);
      grid = locked.reduce((g, b) => addToGrid(b, g), grid);
      detached = [
        ...state.detached,
        ...decomposed.map(block => ({
          ...block,
          speed: speeds.DROP_DETACHED,
        })),
      ];
      current = {
        x: dimensions.SQUARE_SIZE * 7,
        y: 0,
        blocks: state.queue[0],
        dropped: false,
        speed: speeds.DROP_SLOW,
      };
      queue = [queue[1], queue[2], generateRandomPiece()];
    }
    const nextDetached = [];
    for (let i = 0; i < detached.length; i++) {
      if (isFreeBelow(detached[i], grid)) {
        nextDetached.push(detached[i]);
      } else {
        grid = addToGrid(detached[i], grid);
      }
    }
    detached = nextDetached;
    return {
      ...state,
      scanLine,
      grid,
      queue,
      current,
      detached,
    };
  }
  return state;
};

export default reducer;
