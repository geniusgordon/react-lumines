import React from 'react';
import { Reducer } from './types';
import { move, rotate } from '../game/block';
import { getInitGame, tick } from '../game/tick';
import useAnimationFrame from '../hooks/use-animation-frame';
import { Speed } from '../constants';

const reducer: Reducer = (game, action) => {
  switch (action.type) {
    case 'tick':
      return tick(game, action.payload);
    case 'move':
      return {
        ...game,
        activeBlock: move(game.activeBlock, action.payload, game.grid),
      };
    case 'rotate':
      return {
        ...game,
        activeBlock: {
          ...game.activeBlock,
          block: rotate(game.activeBlock.block, action.payload),
        },
      };
    case 'drop':
      return {
        ...game,
        activeBlock: {
          ...game.activeBlock,
          speed: Speed.DROP_FAST,
        },
      };
  }
  return game;
};

function useGame() {
  const [game, dispatch] = React.useReducer(reducer, {}, getInitGame);

  useAnimationFrame(elapsed => {
    dispatch({ type: 'tick', payload: elapsed });
  }, true);

  return { game, dispatch };
}

export default useGame;
