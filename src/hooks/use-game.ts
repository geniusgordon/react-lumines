import React from 'react';
import { ActionType, Reducer } from './types';
import { move, rotate } from '../game/block';
import { getInitGame, tick } from '../game/tick';
import { GameState, GameArgs } from '../game/types';
import { Speed } from '../constants';

const reducer: Reducer = (game, action) => {
  switch (action.type) {
    case ActionType.TICK:
      return tick(game, action.payload);
    case ActionType.MOVE:
      return {
        ...game,
        activeBlock: move(game.activeBlock, action.payload, game.grid),
      };
    case ActionType.ROTATE:
      return {
        ...game,
        activeBlock: {
          ...game.activeBlock,
          block: rotate(game.activeBlock.block, action.payload),
        },
      };
    case ActionType.DROP:
      return {
        ...game,
        activeBlock: {
          ...game.activeBlock,
          speed: Speed.DROP_FAST,
        },
      };
    case ActionType.PAUSE:
      return {
        ...game,
        state: game.state === GameState.PLAY ? GameState.PAUSE : game.state,
      };
    case ActionType.RESUME:
      return {
        ...game,
        state: game.state === GameState.PAUSE ? GameState.PLAY : game.state,
      };
    case ActionType.RESTART:
      return getInitGame({ totalTime: game.totalTime });
  }
};

function useGame(args?: GameArgs) {
  const [game, dispatch] = React.useReducer(reducer, args, getInitGame);

  return { game, dispatch };
}

export default useGame;
