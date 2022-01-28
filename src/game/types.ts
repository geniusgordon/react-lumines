export type Cord = {
  x: number;
  y: number;
};

export interface MovingObject extends Cord {
  speed: Cord;
}

export enum Color {
  LIGHT = 1,
  DARK = 2,
}

export type Block = Color[][];

export type GridIndex = {
  col: number;
  row: number;
};

export type Cell = {
  color: Color;
  matchedBlock?: GridIndex;
  scanned?: Boolean;
  col: number;
  row: number;
} | null;

export type Column = Cell[];
export type Grid = Column[];

export enum RotateDirection {
  CW = 1,
  CCW = -1,
}

export interface ActiveBlock extends MovingObject {
  block: Block;
}

export interface DetachedBlock extends MovingObject {
  color: Color;
}

export interface ScanLine extends MovingObject {}

export enum GameState {
  PAUSE = 'PAUSE',
  PLAY = 'PLAY',
  OVER = 'OVER',
}

export type Game = {
  state: GameState;
  queue: Block[];
  activeBlock: ActiveBlock;
  grid: Grid;
  detachedBlocks: DetachedBlock[];
  scanLine: ScanLine;
  matchedCount: number;
  scannedCount: number;
  score: number;
  time: number;
  totalTime: number;
};

export type GameArgs = {
  totalTime: number;
};

export enum ActionType {
  TICK = 'TICK',
  MOVE = 'MOVE',
  ROTATE = 'ROTATE',
  DROP = 'DROP',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  RESTART = 'RESTART',
}

export type Action =
  | { type: ActionType.TICK; payload: number }
  | { type: ActionType.MOVE; payload: number }
  | { type: ActionType.ROTATE; payload: RotateDirection }
  | { type: ActionType.DROP }
  | { type: ActionType.PAUSE }
  | { type: ActionType.RESUME }
  | { type: ActionType.RESTART };

export type ActionLog = {
  timestamp: number;
  action: Action;
};

export type GameReducer = (prevState: Game, action: Action) => Game;
