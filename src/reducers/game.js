import {
  RESTART,
  PAUSE,
  FINISH,
  LOOP,
  NEXT,
  DECOMPOSE,
  LOCK_DETACHED,
  SCAN,
  UPDATE_MATCHED,
  REMOVE_SCANNED,
} from '../actions';
import {
  range,
  yToRow,
  rowToY,
  generateRandomPiece,
  nextScanLineX,
  nextBlockY,
  addToGrid,
  removeFromGrid,
  getMatchedBlocks,
} from '../utils';
import { gameStates, dimensions, speeds } from '../constants';

const getInitialState = (queue = []) => ({
  now: performance.now(),
  gameState: gameStates.PLAYING,
  gameTime: -2.4,
  score: 0,
  scannedUtilNow: 0,
  scannedGroup: 0,
  scanLine: {
    x: 0,
    speed: speeds.SCAN_LINE_MEDIUM,
  },
  queue,
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
});

const pause = state => ({
  ...state,
  gameState:
    state.gameState === gameStates.PLAYING
      ? gameStates.PAUSED
      : gameStates.PLAYING,
});

const finish = state => ({
  ...state,
  gameState: gameStates.FINISHED,
  score: state.score + state.scannedUtilNow,
  scannedUtilNow: 0,
});

const loop = (state, action) => {
  if (state.gameState === gameStates.PLAYING) {
    if (state.gameTime < 0) {
      return {
        ...state,
        now: action.now,
        gameTime: state.gameTime + action.elapsed,
      };
    }
    return {
      ...state,
      now: action.now,
      gameTime: Math.min(state.gameTime + action.elapsed, 90),
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
  }
  return { ...state, now: action.now };
};

const decompose = (state, action) => ({
  ...state,
  grid: action.locked.reduce((g, b) => addToGrid(b, g), state.grid),
  detached: [
    ...state.detached,
    ...action.decomposed.map(b => ({
      ...b,
      speed: speeds.DROP_DETACHED,
    })),
  ],
});

const next = (state, action) => {
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
};

const lockDetached = (state, action) => {
  const detached = state.detached.filter((_, i) => !action.indexes.includes(i));
  const locked = action.indexes.map(i => ({
    ...state.detached[i],
    y: rowToY(yToRow(state.detached[i].y) + 1),
  }));

  return {
    ...state,
    grid: locked.reduce((g, b) => addToGrid(b, g), state.grid),
    detached,
  };
};

const updateMatched = (state, action) => ({
  ...state,
  grid: getMatchedBlocks(state.grid).reduce(
    (g, b) => addToGrid(b, g),
    state.grid,
  ),
});

const scan = (state, action) => {
  const count = action.scanned.filter(block => block.index === 0).length;
  return {
    ...state,
    scannedUtilNow: action.end ? 0 : state.scannedUtilNow + count,
    scannedGroup: state.scannedGroup + count,
    score: action.end ? state.score + state.scannedUtilNow : state.score,
    grid: action.scanned.reduce(
      (g, b) => addToGrid({ ...b, scanned: true }, g),
      state.grid,
    ),
  };
};

const removeScanned = (state, action) => {
  let grid = state.grid;
  const detached = [];
  for (let i = 0; i < dimensions.GRID_COLUMNS; i++) {
    for (let j = dimensions.GRID_ROWS - 1; j >= 0; j--) {
      if (grid[i][j] && grid[i][j].scanned) {
        grid = removeFromGrid(grid[i][j], grid);
      }
      if (grid[i][j] && grid[i][j + 1] === null) {
        detached.push({
          ...grid[i][j],
          matched: false,
          speed: speeds.DROP_DETACHED,
        });
        grid = removeFromGrid(grid[i][j], grid);
      }
    }
  }
  return {
    ...state,
    scannedGroup: 0,
    grid,
    detached: [...state.detached, ...detached],
  };
};

const reducer = (state = getInitialState(), action) => {
  switch (action.type) {
    case RESTART:
      return getInitialState(action.queue);
    case PAUSE:
      return pause(state, action);
    case FINISH:
      return finish(state, action);
    case LOOP:
      return loop(state, action);
    case DECOMPOSE:
      return decompose(state, action);
    case NEXT:
      return next(state, action);
    case LOCK_DETACHED:
      return lockDetached(state, action);
    case UPDATE_MATCHED:
      return updateMatched(state, action);
    case SCAN:
      return scan(state, action);
    case REMOVE_SCANNED:
      return removeScanned(state, action);
    default:
      return state;
  }
};

export default reducer;
