import { ActionLog, ActionType, Replay, SerializedReplay } from './types';

export function serializeAction(action: ActionLog['action']): string {
  switch (action.type) {
    case ActionType.MOVE:
      return action.payload < 0 ? '1' : '2';
    case ActionType.ROTATE:
      return action.payload < 0 ? '3' : '4';
    case ActionType.DROP:
      return '5';
  }
}

export function deserializeAction(str: string): ActionLog['action'] {
  const type = parseInt(str) - 1;
  switch (Math.floor(type / 2)) {
    case 0:
      return {
        type: ActionType.MOVE,
        payload: type % 2 === 0 ? -1 : 1,
      };
    case 1:
      return {
        type: ActionType.ROTATE,
        payload: type % 2 === 0 ? -1 : 1,
      };
    default:
      return {
        type: ActionType.DROP,
      };
  }
}

export function serializeActionLogs(actionLogs: ActionLog[]): string {
  const logs: number[] = actionLogs.map(a => {
    const sa = serializeAction(a.action);
    return parseInt([sa, Math.floor(a.timestamp / 20)].join(''));
  });
  const arr = Array.from(new Uint8Array(new Uint16Array(logs).buffer));
  const str = String.fromCharCode.apply(null, arr);
  return btoa(str);
}

export function deserializeActionLogs(str: string): ActionLog[] {
  const buf = new Uint16Array(
    new Uint8Array(
      atob(str)
        .split('')
        .map(c => c.charCodeAt(0)),
    ).buffer,
  );
  const sLogs = Array.from(buf);
  return sLogs.map(a => {
    const str = a.toString();
    const action = deserializeAction(str.substring(0, 1));
    return {
      action,
      timestamp: parseInt(str.substring(1)) * 20,
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
