import {
  range,
  colToX,
  rowToY,
  isFreeBelow,
  pieceToBlocks,
  decomposePiece,
} from '../utils';
import { dimensions } from '../constants';

describe('isFreeBelow', () => {
  test('block reach bottom', () => {
    const grid = range(dimensions.GRID_COLUMNS).map(() =>
      range(dimensions.GRID_ROWS).map(() => null),
    );
    expect(
      isFreeBelow({ x: colToX(1), y: rowToY(dimensions.GRID_ROWS - 1) }, grid),
    ).toBeFalsy();
  });
  test('block not reach bottom', () => {
    const grid = range(dimensions.GRID_COLUMNS).map(() =>
      range(dimensions.GRID_ROWS).map(() => null),
    );
    expect(
      isFreeBelow({ x: colToX(1), y: rowToY(dimensions.GRID_ROWS - 2) }, grid),
    ).toBeTruthy();
  });
  test('has block below', () => {
    const grid = range(dimensions.GRID_COLUMNS).map(() =>
      range(dimensions.GRID_ROWS).map(() => null),
    );
    grid[1][dimensions.GRID_ROWS - 1] = true;
    expect(
      isFreeBelow({ x: colToX(1), y: rowToY(dimensions.GRID_ROWS - 2) }, grid),
    ).toBeFalsy();
  });
});

describe('decomposePiece', () => {
  test('no decompose when no space below', () => {
    const grid = range(dimensions.GRID_COLUMNS).map(() =>
      range(dimensions.GRID_ROWS).map(() => null),
    );
    const piece = {
      x: 0,
      y: (dimensions.GRID_ROWS - 2) * dimensions.SQUARE_SIZE,
      blocks: [0, 0, 0, 0],
    };
    const blocks = pieceToBlocks(piece);
    expect(decomposePiece(piece, grid)).toEqual({
      decomposed: [],
      locked: blocks,
    });
  });
  test('decompose the left side', () => {
    const grid = range(dimensions.GRID_COLUMNS).map(() =>
      range(dimensions.GRID_ROWS).map(() => null),
    );
    grid[1][dimensions.GRID_ROWS - 1] = true;
    const piece = {
      x: 0,
      y: (dimensions.GRID_ROWS - 3) * dimensions.SQUARE_SIZE,
      blocks: [0, 0, 0, 0],
    };
    const blocks = pieceToBlocks(piece);
    expect(decomposePiece(piece, grid)).toEqual({
      decomposed: [blocks[3], blocks[0]],
      locked: [blocks[2], blocks[1]],
    });
  });
  test('decompose the right side', () => {
    const grid = range(dimensions.GRID_COLUMNS).map(() =>
      range(dimensions.GRID_ROWS).map(() => null),
    );
    grid[0][dimensions.GRID_ROWS - 1] = true;
    const piece = {
      x: 0,
      y: (dimensions.GRID_ROWS - 3) * dimensions.SQUARE_SIZE,
      blocks: [0, 0, 0, 0],
    };
    const blocks = pieceToBlocks(piece);
    expect(decomposePiece(piece, grid)).toEqual({
      decomposed: [blocks[2], blocks[1]],
      locked: [blocks[3], blocks[0]],
    });
  });
});

describe('pieceToBlocks', () => {
  test('integer x, y', () => {
    const piece = { x: 0, y: 0, blocks: [0, 0, 0, 0] };
    expect(pieceToBlocks(piece)).toEqual([
      { x: 0, y: 0, color: 0 },
      { x: dimensions.SQUARE_SIZE, y: 0, color: 0 },
      { x: dimensions.SQUARE_SIZE, y: dimensions.SQUARE_SIZE, color: 0 },
      { x: 0, y: dimensions.SQUARE_SIZE, color: 0 },
    ]);
  });
  test('float x, y', () => {
    const piece = { x: 0.5, y: 0.5, blocks: [0, 0, 0, 0] };
    expect(pieceToBlocks(piece)).toEqual([
      { x: 0, y: 0, color: 0 },
      { x: dimensions.SQUARE_SIZE, y: 0, color: 0 },
      { x: dimensions.SQUARE_SIZE, y: dimensions.SQUARE_SIZE, color: 0 },
      { x: 0, y: dimensions.SQUARE_SIZE, color: 0 },
    ]);
  });
});
