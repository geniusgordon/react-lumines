import { dimensions } from './constants';

export const range = n => [...new Array(n)].map((_, i) => i);

export const generateRandomPiece = () => {
  const n = Math.floor(Math.random() * 16);
  return [n & 8, n & 4, n & 2, n & 1];
};

export const xToCol = x => Math.floor(x / dimensions.SQUARE_SIZE);
export const yToRow = y => Math.floor(y / dimensions.SQUARE_SIZE);

export const colToX = col => col * dimensions.SQUARE_SIZE;
export const rowToY = row => row * dimensions.SQUARE_SIZE;

export const normalize = x => colToX(xToCol(x));

export const nextScanLineX = (scanLine, elapsed) =>
  (scanLine.x + elapsed * scanLine.speed) % dimensions.GRID_WIDTH;

export const nextBlockY = (block, elapsed) =>
  block.y + Math.min(elapsed * block.speed, dimensions.SQUARE_SIZE);

export const willEnterNextRow = (block, elapsed) =>
  yToRow(block.y) !== yToRow(nextBlockY(block, elapsed));

export const isFreeBelow = (block, grid) => {
  const col = xToCol(block.x);
  const row = yToRow(block.y);
  return grid[col][row + 1] === null;
};

export const willCollide = (piece, grid) => {
  const col = xToCol(piece.x);
  const row = yToRow(piece.y);
  return (
    !isFreeBelow({ x: colToX(col), y: rowToY(row + 1) }, grid) ||
    !isFreeBelow({ x: colToX(col + 1), y: rowToY(row + 1) }, grid)
  );
};

export const addToGrid = (block, grid) => {
  const col = xToCol(block.x);
  const row = yToRow(block.y);
  const x = normalize(block.x);
  const y = normalize(block.y);
  return [
    ...grid.slice(0, col),
    [
      ...grid[col].slice(0, row),
      { x, y, color: block.color },
      ...grid[col].slice(row + 1),
    ],
    ...grid.slice(col + 1),
  ];
};

export const decomposePiece = (blocks, grid) => {
  const left = isFreeBelow(blocks[3], grid);
  const right = isFreeBelow(blocks[2], grid);
  if (!left && !right) {
    return { decomposed: [], locked: blocks };
  }
  if (left) {
    return {
      decomposed: [blocks[3], blocks[0]],
      locked: [blocks[2], blocks[1]],
    };
  }
  if (right) {
    return {
      decomposed: [blocks[2], blocks[1]],
      locked: [blocks[3], blocks[0]],
    };
  }
};
