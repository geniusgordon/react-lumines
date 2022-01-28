import React from 'react';
import { getInitGame } from '../game/tick';
import { GameArgs, Game, Action } from '../game/types';
import reducer from '../game/reducer';

function useGame(args?: GameArgs) {
  const gameRef = React.useRef<Game>(getInitGame(args));

  const dispatch = React.useCallback((action: Action) => {
    gameRef.current = reducer(gameRef.current, action);
  }, []);

  return { gameRef, dispatch };
}

export default useGame;
