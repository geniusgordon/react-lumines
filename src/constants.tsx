import * as polished from 'polished';

const SQUARE_SIZE = 10;
const GRID_COLUMNS = 16;
const GRID_ROWS = 12;

export const Dimension = {
  SQUARE_SIZE,
  GRID_COLUMNS,
  GRID_ROWS,
  GRID_WIDTH: SQUARE_SIZE * GRID_COLUMNS,
  GRID_HEIGHT: SQUARE_SIZE * GRID_ROWS,
  GRID_MID_X: SQUARE_SIZE * (Math.floor(GRID_COLUMNS / 2) - 1),
  SQUARE_STROKE_WIDTH: 0.1,
  SQUARE_STROKE_WIDTH_MATCHED: 0.3,
  GRID_STROKE_WIDTH: 0.1,
  SCAN_LINE_WIDTH: SQUARE_SIZE * 2,
  SCAN_LINE_STROKE_WIDTH: 0.3,
};

export const Palette = {
  BACKGROUND: '#424242',
  COUNTDOWN_BACKGROUND: polished.rgba('#424242', 0.5),
  SQUARE_STROKE: '#212121',
  SQUARE_STROKE_MATCHED: '#FFFFFF',
  SQUARE_DARK: '#FF9800',
  SQUARE_LIGHT: '#FAFAFA',
  SQUARE_DARK_MATCHED: '#FFB74D',
  SQUARE_LIGHT_MATCHED: '#E0E0E0',
  SQUARE_SCANNED: '#757575',
  GRID_STROKE: '#616161',
  SCAN_LINE: '#FFFFFF',
  SCANNED: '#212121',
  LABEL: '#FFFFFF',
  INFO: '#FAFAFA',
  SHADOW: '#03a9f4',
};

export const Speed = {
  SCAN_LINE: (15 * GRID_COLUMNS * SQUARE_SIZE) / (60 * 1000),
  DROP_SLOW: (0 * SQUARE_SIZE) / 1000,
  DROP_FAST: (45 * SQUARE_SIZE) / 1000,
  DROP_DETACHED: (25 * SQUARE_SIZE) / 1000,
};

export const Key = {
  R: 82,
  Z: 90,
  X: 88,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  ESC: 27,
  SPACE: 32,
};
