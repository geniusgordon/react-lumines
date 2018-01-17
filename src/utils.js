import { dimensions } from './constants';

export const range = n => [...new Array(n)].map((_, i) => i);

export const generateRandomPiece = () => {
  const n = Math.floor(Math.random() * 16);
  return [!!(n & 8), !!(n & 4), !!(n & 2), !!(n & 1)];
};

export const xToCol = x => Math.floor(x / dimensions.SQUARE_SIZE);
export const yToRow = y => Math.floor(y / dimensions.SQUARE_SIZE);

export const colToX = col => col * dimensions.SQUARE_SIZE;
export const rowToY = row => row * dimensions.SQUARE_SIZE;

export const normalize = x => colToX(xToCol(x));

export const nextScanLineX = (scanLine, elapsed) =>
  (scanLine.x + Math.min(elapsed * scanLine.speed, dimensions.SQUARE_SIZE)) %
  dimensions.GRID_WIDTH;

export const nextBlockY = (block, elapsed) =>
  block.y + Math.min(elapsed * block.speed, dimensions.SQUARE_SIZE);

export const moveCurrentX = (current, direction) =>
  Math.max(
    Math.min(
      current.x + direction * dimensions.SQUARE_SIZE,
      dimensions.GRID_WIDTH - dimensions.SQUARE_SIZE * 2,
    ),
    0,
  );

export const canMove = (piece, direction, grid) => {
  const col = xToCol(piece.x);
  const row = yToRow(piece.y);
  if (col + direction < 0 || col + direction + 1 >= dimensions.GRID_COLUMNS) {
    return false;
  }
  if (direction === 1) {
    return grid[col + 2][row] === null && grid[col + 2][row + 1] === null;
  } else if (direction === -1) {
    return grid[col - 1][row] === null && grid[col - 1][row + 1] === null;
  }
  return true;
};

export const rotateBlocks = (blocks, direction) =>
  blocks.map((_, i) => blocks[(4 + i - direction) % 4]);

export const willEnterNextRow = (block, elapsed) =>
  yToRow(block.y) !== yToRow(nextBlockY(block, elapsed));

export const willEnterNextColumn = (scanLine, elapsed) =>
  xToCol(scanLine.x) !== xToCol(nextScanLineX(scanLine, elapsed));

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
  if (
    row < 2 ||
    col < 0 ||
    col >= dimensions.GRID_COLUMNS ||
    row < 0 ||
    row >= dimensions.GRID_ROWS
  ) {
    return grid;
  }
  return [
    ...grid.slice(0, col),
    [
      ...grid[col].slice(0, row),
      { ...block, x, y },
      ...grid[col].slice(row + 1),
    ],
    ...grid.slice(col + 1),
  ];
};

export const removeFromGrid = (block, grid) => {
  const col = xToCol(block.x);
  const row = yToRow(block.y);
  return [
    ...grid.slice(0, col),
    [...grid[col].slice(0, row), null, ...grid[col].slice(row + 1)],
    ...grid.slice(col + 1),
  ];
};

export const pieceToBlocks = piece => {
  const x = normalize(piece.x);
  const y = normalize(piece.y);
  return [
    { x, y, color: piece.blocks[0] },
    {
      x: x + dimensions.SQUARE_SIZE,
      y,
      color: piece.blocks[1],
    },
    {
      x: x + dimensions.SQUARE_SIZE,
      y: y + dimensions.SQUARE_SIZE,
      color: piece.blocks[2],
    },
    {
      x,
      y: y + dimensions.SQUARE_SIZE,
      color: piece.blocks[3],
    },
  ];
};

export const decomposePiece = (piece, grid) => {
  const blocks = pieceToBlocks(piece);
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

export const updateMatchedBlocks = grid => {
  for (let i = 0; i < dimensions.GRID_COLUMNS - 1; i++) {
    for (let j = 0; j < dimensions.GRID_ROWS - 1; j++) {
      if (
        grid[i][j] &&
        grid[i + 1][j] &&
        grid[i][j + 1] &&
        grid[i + 1][j + 1] &&
        grid[i][j].color === grid[i + 1][j].color &&
        grid[i][j].color === grid[i][j + 1].color &&
        grid[i][j + 1].color === grid[i + 1][j + 1].color
      ) {
        grid = [
          { ...grid[i][j], matched: true, index: 0 },
          { ...grid[i + 1][j], matched: true, index: 1 },
          { ...grid[i + 1][j + 1], matched: true, index: 2 },
          { ...grid[i][j + 1], matched: true, index: 3 },
        ].reduce((g, b) => addToGrid(b, g), grid);
      } else if (grid[i][j] && grid[i][j].matched && grid[i][j].index === 0) {
        grid = addToGrid({ ...grid[i][j], matched: false }, grid);
      }
    }
  }
  return grid;
};
