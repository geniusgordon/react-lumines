import React from 'react';
import { getInitGame } from '../game/tick';
import {
  GameArgs,
  Game,
  Action,
  ActionType,
  GameState,
  ActionLog,
  Replay,
} from '../game/types';
import reducer from '../game/reducer';
import useGameLoop from './use-game-loop';
import useActionLogger from './use-action-logger';
import { ReplayManagerContext } from './use-replay-manager';

interface UseGameArgs extends GameArgs {
  onUpdate?: (curTime: number, elapsed: number) => void;
  onDispatch?: (game: Game, action: Action) => void;
}

interface UseReplayGameArgs extends GameArgs {
  actionLogs: ActionLog[];
}

function useGame(args?: UseGameArgs) {
  const gameRef = React.useRef<Game>(getInitGame(args));
  const [game, setGame] = React.useState(gameRef.current);

  const dispatch = React.useCallback(
    (action: Action) => {
      if (args?.onDispatch) {
        args.onDispatch(gameRef.current, action);
      }
      gameRef.current = reducer(gameRef.current, action);
      if (
        action.type === ActionType.RESUME ||
        action.type === ActionType.RESTART
      ) {
        setGame(gameRef.current);
      }
    },
    [args],
  );

  useGameLoop({
    dt: 20,
    onUpdate: (curTime, elapsed) => {
      if (args?.onUpdate) {
        args.onUpdate(curTime, elapsed);
      }
      dispatch({ type: ActionType.TICK, payload: elapsed });
    },
    onRender: () => {
      setGame(gameRef.current);
    },
    enabled: game.state === GameState.PLAY,
  });

  return { game, dispatch };
}

export function usePlayGame(args?: UseGameArgs) {
  const { actionLogsRef, logAction } = useActionLogger();
  const { saveReplay } = React.useContext(ReplayManagerContext);
  const [replay, setReplay] = React.useState<Replay | null>(null);

  const { game, dispatch } = useGame({
    ...args,
    onDispatch(game, action) {
      logAction(game, action);
    },
  });

  React.useEffect(() => {
    if (game.state === GameState.OVER) {
      const replay = {
        id: game.id,
        seed: game.seed,
        timestamp: new Date(),
        score: game.score,
        actionLogs: actionLogsRef.current,
      };
      saveReplay(replay);
      setReplay(replay);
    }
  }, [game, actionLogsRef, saveReplay]);

  return { game, dispatch, actionLogsRef, replay };
}

export function useReplayGame({ actionLogs, ...args }: UseReplayGameArgs) {
  const replayIndexRef = React.useRef<number>(0);

  const { game, dispatch } = useGame({
    ...args,
    onDispatch(_, action) {
      if (action.type === ActionType.RESTART) {
        replayIndexRef.current = 0;
      }
    },
    onUpdate() {
      while (
        replayIndexRef.current < actionLogs.length &&
        actionLogs[replayIndexRef.current].timestamp <= game.time
      ) {
        dispatch(actionLogs[replayIndexRef.current].action);
        replayIndexRef.current++;
      }
    },
  });

  return { game, dispatch };
}
