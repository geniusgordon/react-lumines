import { Game, RotateDirection } from '../game/types';

export type Action =
  | { type: 'tick'; payload: number }
  | { type: 'move'; payload: number }
  | { type: 'rotate'; payload: RotateDirection }
  | { type: 'drop' };

export type Reducer = (prevState: Game, action: Action) => Game;
