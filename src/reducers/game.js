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
  matched: [],
};

const checkMatchedBlocks = grid => {
  const matched = [];
  for (let i = 0; i < dimensions.GRID_COLUMNS; i++) {
    for (let j = 0; j < dimensions.GRID_ROWS; j++) {
      if (
        grid[i][j] &&
        grid[i + 1][j] &&
        grid[i][j + 1] &&
        grid[i + 1][j + 1] &&
        grid[i][j].color === grid[i + 1][j].color &&
        grid[i][j].color === grid[i][j + 1].color &&
        grid[i][j + 1].color === grid[i + 1][j + 1].color
      ) {
        matched.push(grid[i][j]);
      }
    }
  }
  return matched;
};

const reducer = (state = initialState, action) => {
  if (action.type === LOOP) {
    const { elapsed } = action;
    let { grid, queue, matched } = state;
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
    let dirty = false;
    if (
      (current.dropped && willCollide(current, grid)) ||
      (willEnterNextRow(current, elapsed) && willCollide(current, grid))
    ) {
      const { decomposed, locked } = decomposePiece(current, grid);
      grid = locked.reduce((g, b) => addToGrid(b, g), grid);
      detached = [
        ...detached,
        ...decomposed.map(block => ({
          ...block,
          speed: speeds.DROP_DETACHED,
        })),
      ];
      current = {
        x: dimensions.SQUARE_SIZE * 7,
        y: 0,
        blocks: queue[0],
        dropped: false,
        speed: speeds.DROP_SLOW,
      };
      queue = [queue[1], queue[2], generateRandomPiece()];
      dirty = true;
    }

    const nextDetached = [];
    for (let i = 0; i < detached.length; i++) {
      if (isFreeBelow(detached[i], grid)) {
        nextDetached.push(detached[i]);
      } else {
        grid = addToGrid(detached[i], grid);
        dirty = true;
      }
    }
    detached = nextDetached;

    if (dirty) {
      matched = checkMatchedBlocks(grid);
    }
    return {
      ...state,
      scanLine,
      grid,
      queue,
      current,
      detached,
      matched,
    };
  }
  return state;
};

export default reducer;
