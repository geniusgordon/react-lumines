import { nextBlockY, nextScanLineX, decompose, getRandomBlock } from './block';
import {
  xyToColRow,
  colRowToXY,
  createEmptyGrid,
  isFreeBelow,
  updateCell,
  updateMatchedBlocks,
  scanColumn,
  removeScanned,
} from './grid';
import {
  GameState,
  Game,
  GameArgs,
  ActiveBlock,
  DetachedBlock,
  Grid,
  ScanLine,
} from './types';
import { Dimension, Speed } from '../constants';

export function getInitGame(args?: GameArgs): Game {
  return {
    state: GameState.PLAY,
    queue: [...new Array(3)].map(() => getRandomBlock()),
    activeBlock: {
      block: getRandomBlock(),
      x: Dimension.GRID_MID_X,
      y: 0,
      speed: Speed.DROP_SLOW,
    },
    grid: createEmptyGrid(),
    detachedBlocks: [],
    scanLine: {
      x: 0,
      speed: Speed.SCAN_LINE,
    },
    matchedCount: 0,
    scannedCount: 0,
    score: 0,
    time: -2400,
    totalTime: args?.totalTime || 60000,
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
  detachedBlocks: DetachedBlock[],
): Boolean {
  const col = xyToColRow(block.x);
  const row = xyToColRow(block.y);

  for (let i = detachedBlocks.length - 1; i >= 0; i--) {
    const d = detachedBlocks[i];
    if (block.x !== d.x && block.x + Dimension.SQUARE_SIZE !== d.x) {
      continue;
    }
    if (block.y + Dimension.SQUARE_SIZE * 2 >= d.y) {
      return true;
    }
  }

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
        col,
        row,
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
    state,
    queue,
    activeBlock,
    grid,
    detachedBlocks,
    scanLine,
    matchedCount,
    scannedCount,
    score,
    time,
    totalTime,
  } = game;

  if (time < 0) {
    return {
      ...game,
      time: time + elapsed,
    };
  }

  activeBlock = {
    ...activeBlock,
    y: nextBlockY(activeBlock, elapsed),
  };
  detachedBlocks = detachedBlocks.map(d => ({
    ...d,
    y: nextBlockY(d, elapsed),
  }));

  if (
    activeBlockWillCollide(activeBlock, grid, detachedBlocks) &&
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
    const scanResult = scanColumn(grid, column);
    grid = scanResult.grid;
    matchedCount += scanResult.matchedCount;
    scannedCount += scanResult.scannedCount;

    if ((scanResult.scannedCount === 0 || isEnd) && scannedCount > 0) {
      const removeResult = removeScanned(grid);
      grid = updateMatchedBlocks(removeResult.grid);
      detachedBlocks = [...detachedBlocks, ...removeResult.detachedBlocks];
    }
    if (isEnd) {
      score += matchedCount;
      matchedCount = 0;
    }
  }

  const isOver = time >= totalTime;
  if (isOver) {
    score += matchedCount;
    matchedCount = 0;
  }

  return {
    state: isOver ? GameState.OVER : state,
    queue,
    activeBlock,
    grid,
    detachedBlocks,
    scanLine: {
      ...scanLine,
      x: nextScanLineX(scanLine, elapsed),
    },
    matchedCount,
    scannedCount,
    score,
    time: time + elapsed,
    totalTime,
  };
}
