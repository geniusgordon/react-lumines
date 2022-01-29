import { serializeActionLogs, deserializeActionLogs } from '../action-log';
import { ActionLog } from '../types';

const actionLogs: ActionLog[] = [
  { action: { type: 'MOVE', payload: 1 }, timestamp: 400 },
  { action: { type: 'MOVE', payload: -1 }, timestamp: 500 },
  { action: { type: 'DROP' }, timestamp: 600 },
  { action: { type: 'ROTATE', payload: 1 }, timestamp: 1000 },
  { action: { type: 'ROTATE', payload: -1 }, timestamp: 1200 },
] as ActionLog[];

test('serialize / deserialize action logs', () => {
  const sActionLogs = serializeActionLogs(actionLogs);
  const dActionLogs = deserializeActionLogs(sActionLogs);
  expect(dActionLogs).toEqual(actionLogs);
});
