import { Game, RotateDirection } from '../game/types';

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

export type Reducer = (prevState: Game, action: Action) => Game;
