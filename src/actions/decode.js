import { colToX, rowToY } from '../utils';
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

export const decodeBlock = tokens => {
  const status = tokens[2].split('');
  return {
    x: colToX(Number(tokens[0])),
    y: rowToY(Number(tokens[1])),
    color: Boolean(Number(status[0])),
    matched: Boolean(Number(status[1])),
    scanned: Boolean(Number(status[2])),
    index: Number(status[3]),
  };
};

export const decodeArray = (tokens, index, count = 1) => {
  const length = Number(tokens[index]);
  const array = [];
  for (let i = 0; i < length; i++) {
    const x = index + 1 + i * count;
    const element = count === 1 ? tokens[x] : tokens.slice(x, x + count);
    array.push(element);
  }
  return array;
};

const decodeMap = [
  tokens => {
    const decomposed = decodeArray(tokens, 1, 3).map(decodeBlock);
    const locked = decodeArray(tokens, 2 + (decomposed.length || 1), 3).map(
      decodeBlock,
    );
    return {
      type: DECOMPOSE,
      decomposed,
      locked,
    };
  },
  tokens => ({
    type: NEXT,
    next: tokens[1].split('').map(s => Boolean(Number(s))),
  }),
  tokens => ({
    type: LOCK_DETACHED,
    indexes: decodeArray(tokens, 1).map(Number),
  }),
  tokens => {
    const scanned = decodeArray(tokens, 1, 3).map(decodeBlock);
    return {
      type: SCAN,
      scanned,
      end: Boolean(Number(tokens[scanned.length + 2])),
    };
  },
  tokens => ({ type: UPDATE_MATCHED }),
  tokens => ({ type: REMOVE_SCANNED }),
  tokens => ({ type: ROTATE, direction: Number(tokens[1]) === 1 ? 1 : -1 }),
  tokens => ({ type: MOVE, direction: Number(tokens[1]) === 1 ? 1 : -1 }),
  tokens => ({ type: DROP }),
  tokens => ({
    type: RESTART,
    queue: [
      tokens[1].split('').map(s => Boolean(Number(s))),
      tokens[2].split('').map(s => Boolean(Number(s))),
      tokens[3].split('').map(s => Boolean(Number(s))),
    ],
  }),
];

const decode = raw =>
  raw.split(' ').map(action => {
    const tokens = action.split(',');
    return decodeMap[Number(tokens[0])](tokens);
  });

export default decode;
