import { dimensions, speeds } from './constants';

export const range = n => [...new Array(n)].map((_, i) => i);

export const generateRandomPiece = () => {
  const n = Math.floor(Math.random() * 16);
  return [n & 8, n & 4, n & 2, n & 1];
};

export const xToCol = x => x / dimensions.SQUARE_SIZE;

export const yToRow = y => y / dimensions.SQUARE_SIZE - 2;

export const nextScanLineX = (scanLine, elapsed) =>
  (scanLine.x + elapsed * scanLine.speed) % dimensions.GRID_WIDTH;

export const nextCurrentY = (current, elapsed) =>
  current.y + elapsed * (current.dropped ? speeds.DROP_FAST : speeds.DROP_SLOW);

const willEnterNextRow = (current, elapsed) =>
  yToRow(current.y) !== yToRow(nextCurrentY(current, elapsed));

const willCollide = (current, grid) => {
  const col = xToCol(current.x);
  const row = yToRow(current.y);
  return (
    grid[col][row + 2] ||
    grid[col + 1][row + 2] ||
    row + 4 === dimensions.GRID_ROWS
  );
};

export const willLock = (current, grid, elapsed) =>
  willEnterNextRow(current, elapsed) && willCollide(current, grid);
