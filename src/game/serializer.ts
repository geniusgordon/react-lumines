import {
  ActionLog,
  ActionType,
  ActionTypeMap,
  Replay,
  SerializedAction,
  SerializedActionLog,
  SerializedReplay,
} from './types';

export function serializeAction(action: ActionLog['action']): SerializedAction {
  switch (action.type) {
    case ActionType.MOVE:
    case ActionType.ROTATE:
      return [ActionTypeMap[action.type], action.payload];
    case ActionType.DROP:
      return [ActionTypeMap[action.type]];
  }
}

export function deserializeAction(s: SerializedAction): ActionLog['action'] {
  if (
    s[0] === ActionTypeMap[ActionType.MOVE] ||
    s[0] === ActionTypeMap[ActionType.ROTATE]
  ) {
    return {
      type: ActionTypeMap[s[0]],
      payload: s[1],
    };
  }
  return {
    type: ActionTypeMap[s[0]],
  };
}

export function serializeActionLogs(
  actionLogs: ActionLog[],
): SerializedActionLog[] {
  return actionLogs.map(a => {
    const sa = serializeAction(a.action);
    return [sa, a.timestamp];
  });
}

export function deserializeActionLogs(
  sLogs: SerializedActionLog[],
): ActionLog[] {
  return sLogs.map(s => {
    const action = deserializeAction(s[0]);
    return {
      action,
      timestamp: s[1],
    };
  });
}

export function serializeReplay(replay: Replay): SerializedReplay {
  return [
    replay.id,
    replay.seed,
    replay.timestamp.toISOString(),
    replay.score,
    serializeActionLogs(replay.actionLogs),
  ];
}

export function deserializeReplay(sReplay: SerializedReplay): Replay {
  return {
    id: sReplay[0],
    seed: sReplay[1],
    timestamp: new Date(sReplay[2]),
    score: sReplay[3],
    actionLogs: deserializeActionLogs(sReplay[4]),
  };
}
