import { tick } from '../tick';
import { getEmptyGrid } from '../grid';
import { Color, DetachedBlock, Game } from '../types';
import { Dimension, Speed } from '../../constants';

test('active block touch bottom', () => {
  const input: Game = {
    queue: [
      [
        [Color.LIGHT, Color.LIGHT],
        [Color.LIGHT, Color.LIGHT],
      ],
    ],
    activeBlock: {
      block: [
        [Color.LIGHT, Color.DARK],
        [Color.DARK, Color.LIGHT],
      ],
      x: 0,
      y: (Dimension.GRID_ROWS - 1.5) * Dimension.SQUARE_SIZE,
      speed: Speed.DROP_FAST,
    },
    detachedBlocks: [],
    grid: getEmptyGrid(),
    scanLine: { x: 0, speed: Speed.SCAN_LINE },
    scannedCount: 0,
  };
  const grid = getEmptyGrid();
  grid[0][Dimension.GRID_ROWS - 1] = { color: Color.DARK };
  grid[0][Dimension.GRID_ROWS - 2] = { color: Color.LIGHT };
  grid[1][Dimension.GRID_ROWS - 1] = { color: Color.LIGHT };
  grid[1][Dimension.GRID_ROWS - 2] = { color: Color.DARK };
  const detachedBlocks: DetachedBlock[] = [];

  const result = tick(input, 0.2);
  expect(result.detachedBlocks).toEqual(detachedBlocks);
  expect(result.grid).toEqual(grid);
});

test('decompose active block', () => {
  const input: Game = {
    queue: [
      [
        [Color.LIGHT, Color.LIGHT],
        [Color.LIGHT, Color.LIGHT],
      ],
    ],
    activeBlock: {
      block: [
        [Color.LIGHT, Color.DARK],
        [Color.DARK, Color.LIGHT],
      ],
      x: 0,
      y: (Dimension.GRID_ROWS - 2.5) * Dimension.SQUARE_SIZE,
      speed: Speed.DROP_FAST,
    },
    detachedBlocks: [],
    grid: getEmptyGrid(),
    scanLine: { x: 0, speed: Speed.SCAN_LINE },
    scannedCount: 0,
  };
  input.grid[0][Dimension.GRID_ROWS - 1] = { color: Color.DARK };

  const grid = getEmptyGrid();
  grid[0][Dimension.GRID_ROWS - 1] = { color: Color.DARK };
  grid[0][Dimension.GRID_ROWS - 2] = { color: Color.DARK };
  grid[0][Dimension.GRID_ROWS - 3] = { color: Color.LIGHT };
  const detachedBlocks: DetachedBlock[] = [
    {
      color: Color.LIGHT,
      x: Dimension.SQUARE_SIZE,
      y: (Dimension.GRID_ROWS - 1.5) * Dimension.SQUARE_SIZE,
      speed: Speed.DROP_DETACHED,
    },
    {
      color: Color.DARK,
      x: Dimension.SQUARE_SIZE,
      y: (Dimension.GRID_ROWS - 2.5) * Dimension.SQUARE_SIZE,
      speed: Speed.DROP_DETACHED,
    },
  ];

  const result = tick(input, 0.2);
  expect(result.detachedBlocks).toEqual(detachedBlocks);
  expect(result.grid).toEqual(grid);
});
