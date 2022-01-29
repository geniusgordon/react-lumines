import { ActionLog, ActionType, ActionTypeMap } from './types';

type SerializedAction =
  | [typeof ActionTypeMap[ActionType.MOVE], number]
  | [typeof ActionTypeMap[ActionType.ROTATE], number]
  | [typeof ActionTypeMap[ActionType.DROP]];

type SerializedActionLog = [SerializedAction, number];

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

export function serializeActionLogs(actionLogs: ActionLog[]): string {
  const s: SerializedActionLog[] = actionLogs.map(a => {
    const sa = serializeAction(a.action);
    return [sa, a.timestamp];
  });

  return JSON.stringify(s);
}

export function deserializeActionLogs(str: string): ActionLog[] {
  try {
    const sLogs = JSON.parse(str) as SerializedActionLog[];
    return sLogs.map(s => {
      const action = deserializeAction(s[0]);
      return {
        action,
        timestamp: s[1],
      };
    });
  } catch (error) {
    console.log('parse error:', error);
    throw error;
  }
}
