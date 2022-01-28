import React from 'react';
import { getInitGame } from '../game/tick';
import {
  GameArgs,
  Game,
  Action,
  ActionLog,
  ActionType,
  GameState,
} from '../game/types';
import reducer from '../game/reducer';
import useGameLoop from './use-game-loop';

function shouldLog(action: Action) {
  return (
    action.type === ActionType.MOVE ||
    action.type === ActionType.ROTATE ||
    action.type === ActionType.DROP
  );
}

function useGame(args?: GameArgs) {
  const gameRef = React.useRef<Game>(getInitGame(args));
  const [game, setGame] = React.useState(gameRef.current);
  const renderTimeRef = React.useRef<number>(gameRef.current.time);
  const actionLogsRef = React.useRef<ActionLog[]>([]);

  const dispatch = React.useCallback((action: Action) => {
    if (shouldLog(action)) {
      actionLogsRef.current = [
        ...actionLogsRef.current,
        { action, timestamp: gameRef.current.time },
      ];
    }
    gameRef.current = reducer(gameRef.current, action);
    if (action.type === ActionType.RESTART) {
      setGame(gameRef.current);
      renderTimeRef.current = gameRef.current.time;
    }
  }, []);

  useGameLoop({
    dt: 20,
    onUpdate: (_, elapsed) => {
      dispatch({ type: ActionType.TICK, payload: elapsed });
    },
    onRender: () => {
      setGame(gameRef.current);
    },
    enabled: game.state === GameState.PLAY,
  });

  return { game, dispatch };
}

export default useGame;
