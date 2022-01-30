import { serializeReplay, deserializeReplay } from '../serializer';
import { ActionLog } from '../types';

const actionLogs: ActionLog[] = [
  { action: { type: 'MOVE', payload: 1 }, timestamp: 400 },
  { action: { type: 'MOVE', payload: -1 }, timestamp: 500 },
  { action: { type: 'DROP' }, timestamp: 600 },
  { action: { type: 'ROTATE', payload: 1 }, timestamp: 1000 },
  { action: { type: 'ROTATE', payload: -1 }, timestamp: 1200 },
] as ActionLog[];

const replay = {
  id: 'id',
  seed: 'seed',
  timestamp: new Date(),
  score: 100,
  actionLogs,
};

test('serialize / deserialize replay', () => {
  const sReplay = serializeReplay(replay);
  const dReplay = deserializeReplay(sReplay);
  expect(dReplay).toEqual(replay);
});
