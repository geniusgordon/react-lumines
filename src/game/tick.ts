import { nextBlockY, nextScanLineX, decompose, getRandomBlock } from './block';
import {
  xyToColRow,
  colRowToXY,
  getEmptyGrid,
  isFreeBelow,
  updateCell,
  updateMatchedBlocks,
  scanColumn,
  removeScanned,
} from './grid';
import { Game, ActiveBlock, DetachedBlock, Grid, ScanLine } from './types';
import { Dimension, Speed } from '../constants';

export function getInitGame(): Game {
  return {
    queue: [...new Array(3)].map(() => getRandomBlock()),
    activeBlock: {
      block: getRandomBlock(),
      x: Dimension.GRID_MID_X,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    grid: getEmptyGrid(),
    detachedBlocks: [],
    scanLine: {
      x: 0,
      speed: Speed.SCAN_LINE,
    },
    scannedCount: 0,
  };
}

export function willEnterNextRow(block: ActiveBlock, elapsed: number): Boolean {
  return xyToColRow(block.y) !== xyToColRow(nextBlockY(block, elapsed));
}

export function willEnterNextColum(
  scanLine: ScanLine,
  elapsed: number,
): Boolean {
  return (
    xyToColRow(scanLine.x) !== xyToColRow(nextScanLineX(scanLine, elapsed))
  );
}

export function activeBlockWillCollide(
  block: ActiveBlock,
  grid: Grid,
): Boolean {
  const col = xyToColRow(block.x);
  const row = xyToColRow(block.y);
  return (
    !isFreeBelow(grid, { x: colRowToXY(col), y: colRowToXY(row + 1) }) ||
    !isFreeBelow(grid, { x: colRowToXY(col + 1), y: colRowToXY(row + 1) })
  );
}

export function checkDetachedBlocks(
  grid: Grid,
  detachedBlocks: DetachedBlock[],
): { grid: Grid; detachedBlocks: DetachedBlock[] } {
  let newGrid: Grid = grid;
  let newDetachedBlocks: DetachedBlock[] = [];
  detachedBlocks.forEach(b => {
    if (isFreeBelow(newGrid, b)) {
      newDetachedBlocks.push(b);
    } else {
      const col = xyToColRow(b.x);
      const row = xyToColRow(b.y);
      const cell = {
        color: b.color,
      };
      newGrid = updateCell(newGrid, cell, col, row);
    }
  });
  return { grid: newGrid, detachedBlocks: newDetachedBlocks };
}

export function scan(grid: Grid, column: number): Grid {
  return grid;
}

export function tick(game: Game, elapsed: number): Game {
  let {
    queue,
    activeBlock,
    grid,
    detachedBlocks,
    scanLine,
    scannedCount,
  } = game;

  if (
    activeBlockWillCollide(activeBlock, grid) &&
    (activeBlock.speed > Speed.DROP_SLOW ||
      willEnterNextRow(activeBlock, elapsed))
  ) {
    detachedBlocks = [...detachedBlocks, ...decompose(activeBlock)];
    activeBlock = {
      block: queue[0],
      x: Dimension.GRID_MID_X,
      y: 0,
      speed: Speed.DROP_SLOW,
    };
    queue = [...queue.slice(1), getRandomBlock()];
  }

  ({ grid, detachedBlocks } = checkDetachedBlocks(grid, detachedBlocks));

  grid = updateMatchedBlocks(grid);

  if (willEnterNextColum(scanLine, elapsed)) {
    const column = (xyToColRow(scanLine.x) + 1) % Dimension.GRID_COLUMNS;
    const isEnd = column === Dimension.GRID_COLUMNS - 1;
    let count = 0;
    ({ grid, count } = scanColumn(grid, column));
    scannedCount += count;

    if ((count === 0 || isEnd) && scannedCount > 0) {
      const removeResult = removeScanned(grid);
      grid = removeResult.grid;
      detachedBlocks = [...detachedBlocks, ...removeResult.detachedBlocks];
    }
  }

  return {
    queue,
    activeBlock: {
      ...activeBlock,
      y: nextBlockY(activeBlock, elapsed),
    },
    grid,
    detachedBlocks,
    scanLine: {
      ...scanLine,
      x: nextScanLineX(scanLine, elapsed),
    },
    scannedCount,
  };
}
