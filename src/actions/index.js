import { generateRandomPiece } from '../utils';

export const LOOP = 'LOOP';

export const NEXT = 'GAME.NEXT';
export const DECOMPOSE = 'GAME.DECOMPOSE';
export const LOCK_DETACHED = 'GAME.LOCK_DETACHED';
export const SCAN = 'GAME.SCAN';
export const UPDATE_MATCHED = 'GAME.UPDATE_MATCHED';
export const REMOVE_SCANNED = 'GAME.REMOVE_SCANNED';

export const ROTATE = 'MOVE.ROTATE';
export const MOVE = 'MOVE.MOVE';
export const DROP = 'MOVE.DROP';

export const PAUSE = 'STATE.PAUSE';
export const RESTART = 'STATE.RESTART';
export const QUIT = 'STATE.QUIT';
export const FINISH = 'STATE.FINISH';

export const loop = (now, elapsed) => ({ type: LOOP, now, elapsed });

export const next = () => ({ type: NEXT, next: generateRandomPiece() });
export const decompose = ({ decomposed, locked }) => ({
  type: DECOMPOSE,
  decomposed,
  locked,
});
export const lockDetached = indexes => ({ type: LOCK_DETACHED, indexes });
export const scan = (scanned, end) => ({ type: SCAN, scanned, end });
export const updateMatched = () => ({ type: UPDATE_MATCHED });
export const removeScanned = () => ({ type: REMOVE_SCANNED });

export const rotate = direction => ({ type: ROTATE, direction });
export const move = direction => ({ type: MOVE, direction });
export const drop = () => ({ type: DROP });

export const pause = () => ({ type: PAUSE });
export const restart = () => ({ type: RESTART });
export const quit = () => ({ type: QUIT });
export const finish = () => ({ type: FINISH });
