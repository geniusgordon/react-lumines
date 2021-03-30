import React from 'react';
import { Reducer } from './types';
import { getRandomBlock } from '../game/block';
import { getEmptyGrid } from '../game/grid';
import { tick } from '../game/tick';
import { Game } from '../game/types';
import useAnimationFrame from '../hooks/use-animation-frame';
import { Dimension, Speed } from '../constants';

function initGame(): Game {
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

const reducer: Reducer = (game, action) => {
  if (action.type === 'tick') {
    return tick(game, action.payload);
  }
  return game;
};

function useGame() {
  const [game, dispatch] = React.useReducer(reducer, {}, initGame);

  useAnimationFrame(elapsed => {
    dispatch({ type: 'tick', payload: elapsed });
  }, true);

  return { game, dispatch };
}

export default useGame;
