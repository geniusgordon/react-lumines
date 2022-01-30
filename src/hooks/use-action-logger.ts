import React from 'react';
import { Game, Action, ActionLog, ActionType } from '../game/types';

function useActionLogger() {
  const actionLogsRef = React.useRef<ActionLog[]>([]);

  const logAction = React.useCallback((game: Game, action: Action) => {
    if (
      action.type === ActionType.MOVE ||
      action.type === ActionType.ROTATE ||
      action.type === ActionType.DROP
    ) {
      actionLogsRef.current.push({ action, timestamp: game.time });
    }
    if (action.type === 'RESTART') {
      actionLogsRef.current = [];
    }
  }, []);

  return { actionLogsRef, logAction };
}

export default useActionLogger;
