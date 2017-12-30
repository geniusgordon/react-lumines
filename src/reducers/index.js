import { UPDATE, ROTATE, MOVE, DROP } from '../actions';
import { dimensions, speeds } from '../constants';
import { range } from '../utils';

const initialState = {
  scanLine: {
    x: 0,
    speed: speeds.SCAN_LINE_MEDIUM,
  },
  grid: range(dimensions.GRID_COLUMNS).map(() =>
    range(dimensions.GRID_ROWS).map(() => null),
  ),
  queue: [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 1]],
  current: {
    x: dimensions.SQUARE_SIZE * 7,
    y: 0,
    blocks: [0, 1, 1, 0],
    dropped: false,
  },
};

const updateScanLineX = (scanLine, elapsed) =>
  (scanLine.x + elapsed * scanLine.speed) % dimensions.GRID_WIDTH;

const updateCurrentY = (current, elapsed) =>
  Math.min(
    current.y +
      elapsed * (current.dropped ? speeds.DROP_FAST : speeds.DROP_SLOW),
    dimensions.GRID_HEIGHT - dimensions.SQUARE_SIZE * 2,
  );

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

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE:
      return {
        ...state,
        scanLine: {
          ...state.scanLine,
          x: updateScanLineX(state.scanLine, action.elapsed),
        },
        current: {
          ...state.current,
          y: updateCurrentY(state.current, action.elapsed),
        },
      };
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
        },
      };
    default:
      return state;
  }
};

export default reducer;
