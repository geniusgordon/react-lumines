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

export const nextScanLineX = (scanLine, elapsed) =>
  (scanLine.x + elapsed * scanLine.speed) % dimensions.GRID_WIDTH;

export const nextCurrentY = (current, elapsed) =>
  current.y +
  Math.min(
    elapsed * (current.dropped ? speeds.DROP_FAST : speeds.DROP_SLOW),
    dimensions.SQUARE_SIZE,
  );

const willEnterNextRow = (current, elapsed) =>
  yToRow(current.y) !== yToRow(nextCurrentY(current, elapsed));

const willCollide = (current, grid) => {
  const col = xToCol(current.x);
  const row = yToRow(current.y);
  return grid[col][row + 2] !== null || grid[col + 1][row + 2] !== null;
};

export const willLock = (current, grid, elapsed) => {
  if (current.dropped) {
    const next = {
      x: current.x,
      y: nextCurrentY(current, elapsed),
    };
    return willCollide(next, grid);
  }
  return willEnterNextRow(current, elapsed) && willCollide(current, grid);
};

export const lockCurrent = (current, grid) => {
  const col = xToCol(current.x);
  const row = yToRow(current.y) + (current.dropped ? 1 : 0);
  const x = colToX(col);
  const y = rowToY(row);
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
