import { GameReducer, ActionType } from './types';
import { move, rotate } from './block';
import { getInitGame, tick } from './tick';
import { GameState } from './types';
import { Speed } from '../constants';

const reducer: GameReducer = (game, action) => {
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
          speed: {
            x: 0,
            y: Speed.DROP_FAST,
          },
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

export default reducer;
