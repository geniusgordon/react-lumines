import React from 'react';
import { Reducer } from './types';
import { getInitGame, tick } from '../game/tick';
import useAnimationFrame from '../hooks/use-animation-frame';

const reducer: Reducer = (game, action) => {
  if (action.type === 'tick') {
    return tick(game, action.payload);
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
