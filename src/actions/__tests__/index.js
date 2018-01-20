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
} from '../index';
import encode, { encodeBlock } from '../encode';
import decode, { decodeBlock, decodeArray } from '../decode';

describe('block', () => {
  test('encode', () => {
    const block = {
      x: 10,
      y: 20,
      color: true,
      matched: false,
      scanned: true,
      index: 0,
    };
    expect(encodeBlock(block)).toEqual('1,2,1010');
  });
  test('decode', () => {
    const block = {
      x: 10,
      y: 20,
      color: true,
      matched: false,
      scanned: true,
      index: 0,
    };
    expect(decodeBlock('1,2,1010'.split(','))).toEqual(block);
  });
});

describe('decodeArray', () => {
  test('1 at a time', () => {
    expect(decodeArray(['3', 'a', 'b', 'c'], 0)).toEqual(['a', 'b', 'c']);
  });
  test('2 at a time', () => {
    expect(decodeArray(['2', 'a', 'b', 'c', 'd'], 0, 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('next', () => {
  test('encode', () => {
    const action = { type: NEXT, next: [true, false, true, false] };
    expect(encode(action)).toEqual('0,1010');
  });
  test('decode', () => {
    const action = { type: NEXT, next: [true, false, true, false] };
    expect(decode('0,1010')[0]).toEqual(action);
  });
});

describe('decompose', () => {
  test('encode', () => {
    const block = {
      x: 10,
      y: 20,
      color: true,
      matched: false,
      scanned: true,
      index: 0,
    };
    const action = {
      type: DECOMPOSE,
      decomposed: [],
      locked: [block, block],
    };
    expect(encode(action)).toEqual('1,0,,2,1,2,1010,1,2,1010');
  });
  test('decode', () => {
    const block = {
      x: 10,
      y: 20,
      color: true,
      matched: false,
      scanned: true,
      index: 0,
    };
    const action = {
      type: DECOMPOSE,
      decomposed: [],
      locked: [block, block],
    };
    expect(decode('1,0,,2,1,2,1010,1,2,1010')[0]).toEqual(action);
  });
});

describe('lockDetached', () => {
  test('encode', () => {
    const action = {
      type: LOCK_DETACHED,
      indexes: [1, 2, 3, 4],
    };
    expect(encode(action)).toEqual('2,4,1,2,3,4');
  });
  test('decode', () => {
    const action = {
      type: LOCK_DETACHED,
      indexes: [1, 2, 3, 4],
    };
    expect(decode('2,4,1,2,3,4')[0]).toEqual(action);
  });
});

describe('scan', () => {
  test('encode', () => {
    const block = {
      x: 10,
      y: 20,
      color: true,
      matched: false,
      scanned: true,
      index: 0,
    };
    const action = {
      type: SCAN,
      scanned: [block, block],
      end: true,
    };
    expect(encode(action)).toEqual('3,2,1,2,1010,1,2,1010,1');
  });
  test('decode', () => {
    const block = {
      x: 10,
      y: 20,
      color: true,
      matched: false,
      scanned: true,
      index: 0,
    };
    const action = {
      type: SCAN,
      scanned: [block, block],
      end: true,
    };
    expect(decode('3,2,1,2,1010,1,2,1010,1')[0]).toEqual(action);
  });
});
