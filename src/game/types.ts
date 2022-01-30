import { RandomSeed } from 'random-seed';

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

export enum MoveDirection {
  LEFT = -1,
  RIGHT = 1,
}

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
  id: string;
  seed: string;
  prng?: RandomSeed;
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
  id?: string;
  seed?: string;
  totalTime?: number;
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

export const ActionTypeMap = {
  TICK: 0,
  MOVE: 1,
  ROTATE: 2,
  DROP: 3,
  PAUSE: 4,
  RESUME: 5,
  RESTART: 6,
  0: ActionType.TICK,
  1: ActionType.MOVE,
  2: ActionType.ROTATE,
  3: ActionType.DROP,
  4: ActionType.PAUSE,
  5: ActionType.RESUME,
  6: ActionType.RESTART,
} as const;

export type MoveAction = {
  type: ActionType.MOVE;
  payload: MoveDirection;
};
export type RotateAction = {
  type: ActionType.ROTATE;
  payload: RotateDirection;
};
export type DropAction = { type: ActionType.DROP };

export type Action =
  | { type: ActionType.TICK; payload: number }
  | MoveAction
  | RotateAction
  | DropAction
  | { type: ActionType.PAUSE }
  | { type: ActionType.RESUME }
  | { type: ActionType.RESTART; payload?: GameArgs };

export type ActionLog = {
  timestamp: number;
  action: MoveAction | RotateAction | DropAction;
};

export type GameReducer = (prevState: Game, action: Action) => Game;

export type SerializedAction =
  | [typeof ActionTypeMap[ActionType.MOVE], number]
  | [typeof ActionTypeMap[ActionType.ROTATE], number]
  | [typeof ActionTypeMap[ActionType.DROP]];

export type SerializedActionLog = [SerializedAction, number];

export type SerializedReplay = [
  string, // id
  string, // seed
  string, // timestamp
  number, // score
  SerializedActionLog[],
];

export type Replay = {
  id: string;
  seed: string;
  timestamp: Date;
  score: number;
  actionLogs: ActionLog[];
};

export type ReplayManager = {
  [id: string]: Replay;
};
