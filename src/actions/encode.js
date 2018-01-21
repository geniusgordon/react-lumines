import { xToCol, yToRow } from '../utils';
import {
  DECOMPOSE,
  NEXT,
  LOCK_DETACHED,
  SCAN,
  UPDATE_MATCHED,
  REMOVE_SCANNED,
  ROTATE,
  MOVE,
  DROP,
  RESTART,
} from './index';

export const encodeBlock = block => {
  const { x, y, color, matched = false, scanned = false, index = 0 } = block;
  const status = `${Number(color)}${Number(matched)}${Number(scanned)}${index}`;
  return `${xToCol(x)},${yToRow(y)},${status}`;
};

const encodeMap = {
  [DECOMPOSE]: action => {
    const { decomposed, locked } = action;
    const d = decomposed.map(encodeBlock).join(',');
    const l = locked.map(encodeBlock).join(',');
    return `0,${decomposed.length},${d},${locked.length},${l}`;
  },
  [NEXT]: action => `1,${action.next.map(b => Number(b)).join('')}`,
  [LOCK_DETACHED]: action => {
    const { indexes, locked } = action;
    const l = locked.map(encodeBlock).join(',');
    return `2,${indexes.length},${indexes.join(',')},${locked.length},${l}`;
  },
  [SCAN]: action => {
    const { scanned, end } = action;
    const s = scanned.map(encodeBlock).join(',');
    return `3,${scanned.length},${s},${Number(end)}`;
  },
  [UPDATE_MATCHED]: () => '4',
  [REMOVE_SCANNED]: () => '5',
  [ROTATE]: action => `6,${action.direction === 1 ? 1 : 0}`,
  [MOVE]: action => `7,${action.direction === 1 ? 1 : 0}`,
  [DROP]: () => '8',
  [RESTART]: action => {
    const f = action.first.map(b => Number(b)).join('');
    const q = action.queue.map(p => p.map(b => Number(b)).join('')).join(',');
    return `9,${f},${q}`;
  },
};

const encode = action => `${encodeMap[action.type](action)},${action.time}`;
export default encode;
