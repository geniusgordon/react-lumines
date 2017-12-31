import { dimensions, speeds } from './constants';

export const range = n => [...new Array(n)].map((_, i) => i);

export const generateRandomPiece = () => {
  const n = Math.floor(Math.random() * 16);
  return [n & 8, n & 4, n & 2, n & 1];
};

export const xToCol = x => Math.floor(x / dimensions.SQUARE_SIZE);
export const yToRow = y => Math.floor(y / dimensions.SQUARE_SIZE);

export const colToX = col => col * dimensions.SQUARE_SIZE;
export const rowToY = row => row * dimensions.SQUARE_SIZE;

export const normalizeX = x => colToX(xToCol(x));
export const normalizeY = y => rowToY(yToRow(y));

export const nextScanLineX = (scanLine, elapsed) =>
  (scanLine.x + elapsed * scanLine.speed) % dimensions.GRID_WIDTH;

export const nextCurrentY = (current, elapsed) =>
  current.y + elapsed * (current.dropped ? speeds.DROP_FAST : speeds.DROP_SLOW);

const willEnterNextRow = (current, elapsed) =>
  yToRow(current.y) !== yToRow(nextCurrentY(current, elapsed));

const willCollide = (current, grid) => {
  const col = xToCol(current.x);
  const row = yToRow(current.y);
  return grid[col][row + 2] !== null || grid[col + 1][row + 2] !== null;
};

export const willLock = (current, grid, elapsed) =>
  willEnterNextRow(current, elapsed) && willCollide(current, grid);

export const lockCurrent = (current, grid) => {
  const col = xToCol(current.x);
  const row = yToRow(current.y);
  const x = normalizeX(current.x);
  const y = normalizeY(current.y);
  return [
    ...grid.slice(0, col),
    [
      ...grid[col].slice(0, row),
      { x, y, color: current.blocks[0] },
      {
        x,
        y: y + dimensions.SQUARE_SIZE,
        color: current.blocks[3],
      },
      ...grid[col].slice(row + 2),
    ],
    [
      ...grid[col + 1].slice(0, row),
      {
        x: x + dimensions.SQUARE_SIZE,
        y,
        color: current.blocks[1],
      },
      {
        x: x + dimensions.SQUARE_SIZE,
        y: y + dimensions.SQUARE_SIZE,
        color: current.blocks[2],
      },
      ...grid[col + 1].slice(row + 2),
    ],
    ...grid.slice(col + 2),
  ];
};
