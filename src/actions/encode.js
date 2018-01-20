import { xToCol, yToRow } from '../utils';
import {
  NEXT,
  DECOMPOSE,
  LOCK_DETACHED,
  SCAN,
  UPDATE_MATCHED,
  REMOVE_SCANNED,
  ROTATE,
  MOVE,
  DROP,
} from './index';

export const encodeBlock = block => {
  const { x, y, color, matched = false, scanned = false, index = 0 } = block;
  const status = `${Number(color)}${Number(matched)}${Number(scanned)}${index}`;
  return `${xToCol(x)},${yToRow(y)},${status}`;
};

const encodeMap = {
  [NEXT]: action => `0,${action.next.map(b => Number(b)).join('')}`,
  [DECOMPOSE]: action => {
    const { decomposed, locked } = action;
    const d = decomposed.map(encodeBlock).join(',');
    const l = locked.map(encodeBlock).join(',');
    return `1,${decomposed.length},${d},${locked.length},${l}`;
  },
  [LOCK_DETACHED]: action => {
    const { indexes } = action;
    return `2,${indexes.length},${indexes.join(',')}`;
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
};

const encode = action => encodeMap[action.type](action);
export default encode;
