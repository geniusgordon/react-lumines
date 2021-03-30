import { Game } from '../game/types';

export type Action = { type: 'tick', payload: number };

export type Reducer = (prevState: Game, action: Action) => Game;
