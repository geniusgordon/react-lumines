import {
  RESTART,
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
  const block = {
    x: 10,
    y: 20,
    color: true,
    matched: false,
    scanned: true,
    index: 0,
  };
  const encoded = '1,2,1010';

  test('encode', () => {
    expect(encodeBlock(block)).toEqual(encoded);
  });
  test('decode', () => {
    expect(decodeBlock(encoded.split(','))).toEqual(block);
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

describe('decompose', () => {
  const block = {
    x: 10,
    y: 20,
    color: true,
    matched: false,
    scanned: true,
    index: 0,
  };

  describe('decompose empty', () => {
    const action = {
      type: DECOMPOSE,
      decomposed: [],
      locked: [block, block],
      time: 0,
    };
    const encoded = '0,0,,2,1,2,1010,1,2,1010,0';

    test('encode', () => {
      expect(encode(action)).toEqual(encoded);
    });
    test('decode', () => {
      expect(decode(encoded)[0]).toEqual(action);
    });
  });

  describe('decomposed not empty', () => {
    const action = {
      type: DECOMPOSE,
      decomposed: [block, block],
      locked: [block, block],
      time: 0,
    };
    const encoded = '0,2,1,2,1010,1,2,1010,2,1,2,1010,1,2,1010,0';

    test('encode', () => {
      expect(encode(action)).toEqual(encoded);
    });
    test('decode', () => {
      expect(decode(encoded)[0]).toEqual(action);
    });
  });
});

describe('next', () => {
  test('encode', () => {
    const action = { type: NEXT, next: [true, false, true, false], time: 0 };
    expect(encode(action)).toEqual('1,1010,0');
  });
  test('decode', () => {
    const action = { type: NEXT, next: [true, false, true, false], time: 0 };
    expect(decode('1,1010,0')[0]).toEqual(action);
  });
});

describe('lockDetached', () => {
  const block = {
    x: 10,
    y: 20,
    color: true,
    matched: false,
    scanned: true,
    index: 0,
  };
  const action = {
    type: LOCK_DETACHED,
    indexes: [1, 2, 3, 4],
    locked: [block, block, block, block],
    time: 0,
  };
  const encoded = '2,4,1,2,3,4,4,1,2,1010,1,2,1010,1,2,1010,1,2,1010,0';

  test('encode', () => {
    expect(encode(action)).toEqual(encoded);
  });
  test('decode', () => {
    expect(decode(encoded)[0]).toEqual(action);
  });
});

describe('scan', () => {
  const block = {
    x: 10,
    y: 20,
    color: true,
    matched: false,
    scanned: true,
    index: 0,
  };

  describe('empty', () => {
    const action = {
      type: SCAN,
      scanned: [],
      end: true,
      time: 0,
    };
    const encoded = '3,0,,1,0';

    test('encode', () => {
      expect(encode(action)).toEqual(encoded);
    });
    test('decode', () => {
      expect(decode(encoded)[0]).toEqual(action);
    });
  });

  describe('not empty', () => {
    const action = {
      type: SCAN,
      scanned: [block, block],
      end: true,
      time: 0,
    };
    const encoded = '3,2,1,2,1010,1,2,1010,1,0';

    test('encode', () => {
      expect(encode(action)).toEqual(encoded);
    });
    test('decode', () => {
      expect(decode(encoded)[0]).toEqual(action);
    });
  });
});

describe('restart', () => {
  const piece = [true, true, false, false];
  const action = {
    type: RESTART,
    first: piece,
    queue: [piece, piece, piece],
    time: 0,
  };
  const encoded = '9,1100,1100,1100,1100,0';

  test('encode', () => {
    expect(encode(action)).toEqual(encoded);
  });
  test('decode', () => {
    expect(decode(encoded)[0]).toEqual(action);
  });
});
