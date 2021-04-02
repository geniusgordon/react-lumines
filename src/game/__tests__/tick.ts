import { tick } from '../tick';
import { createEmptyGrid } from '../grid';
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
    grid: createEmptyGrid(),
    scanLine: { x: 0, speed: Speed.SCAN_LINE },
    matchedCount: 0,
    scannedCount: 0,
    score: 0,
    time: 0,
  };
  const grid = createEmptyGrid();
  const cells = [
    [0, Dimension.GRID_ROWS - 1, Color.DARK],
    [0, Dimension.GRID_ROWS - 2, Color.LIGHT],
    [1, Dimension.GRID_ROWS - 1, Color.LIGHT],
    [1, Dimension.GRID_ROWS - 2, Color.DARK],
  ];
  cells.forEach(([col, row, color]) => {
    grid[col][row] = { color, col, row };
  });
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
    grid: createEmptyGrid(),
    scanLine: { x: 0, speed: Speed.SCAN_LINE },
    matchedCount: 0,
    scannedCount: 0,
    score: 0,
    time: 0,
  };
  input.grid[0][Dimension.GRID_ROWS - 1] = {
    color: Color.DARK,
    col: 0,
    row: Dimension.GRID_ROWS - 1,
  };

  const elapse = 0.2;
  const grid = createEmptyGrid();
  const cells = [
    [0, Dimension.GRID_ROWS - 1, Color.DARK],
    [0, Dimension.GRID_ROWS - 2, Color.DARK],
    [0, Dimension.GRID_ROWS - 3, Color.LIGHT],
  ];
  cells.forEach(([col, row, color]) => {
    grid[col][row] = { color, col, row };
  });
  const detachedBlocks: DetachedBlock[] = [
    {
      color: Color.LIGHT,
      x: Dimension.SQUARE_SIZE,
      y:
        (Dimension.GRID_ROWS - 1.5) * Dimension.SQUARE_SIZE +
        Speed.DROP_DETACHED * elapse,
      speed: Speed.DROP_DETACHED,
    },
    {
      color: Color.DARK,
      x: Dimension.SQUARE_SIZE,
      y:
        (Dimension.GRID_ROWS - 2.5) * Dimension.SQUARE_SIZE +
        Speed.DROP_DETACHED * elapse,
      speed: Speed.DROP_DETACHED,
    },
  ];

  const result = tick(input, elapse);
  expect(result.detachedBlocks).toEqual(detachedBlocks);
  expect(result.grid).toEqual(grid);
});
