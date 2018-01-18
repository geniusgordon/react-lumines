import { generateRandomPiece } from '../utils';

export const PAUSE = 'PAUSE';
export const RESTART = 'RESTART';
export const QUIT = 'QUIT';
export const FINISH = 'FINISH';

export const LOOP = 'LOOP';
export const NEXT = 'NEXT';
export const DECOMPOSE = 'DECOMPOSE';
export const LOCK_DETACHED = 'LOCK_DETACHED';
export const SCAN = 'SCAN';
export const UPDATE_MATCHED = 'UPDATE_MATCHED';
export const REMOVE_SCANNED = 'REMOVE_SCANNED';

export const ROTATE = 'ROTATE';
export const MOVE = 'MOVE';
export const DROP = 'DROP';

export const pause = () => ({ type: PAUSE });
export const restart = () => ({ type: RESTART });
export const quit = () => ({ type: QUIT });
export const finish = () => ({ type: FINISH });

export const rotate = direction => ({ type: ROTATE, direction });
export const move = direction => ({ type: MOVE, direction });
export const drop = () => ({ type: DROP });

export const loop = (now, elapsed) => ({ type: LOOP, now, elapsed });

export const decompose = ({ decomposed, locked }) => ({
  type: DECOMPOSE,
  decomposed,
  locked,
});
export const next = () => ({ type: NEXT, next: generateRandomPiece() });
export const lockDetached = indexes => ({ type: LOCK_DETACHED, indexes });
export const scan = (scanned, end) => ({ type: SCAN, scanned, end });
export const updateMatched = () => ({ type: UPDATE_MATCHED });
export const removeScanned = () => ({ type: REMOVE_SCANNED });
