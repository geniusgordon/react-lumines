import { generateRandomPiece } from '../utils';

export const PAUSE = 'PAUSE';
export const RESTART = 'RESTART';
export const QUIT = 'QUIT';
export const FINISH = 'FINISH';

export const LOOP = 'LOOP';
export const NEXT = 'NEXT';
export const SCAN = 'SCAN';
export const UPDATE_DETACHED = 'UPDATE_DETACHED';
export const UPDATE_GRID = 'UPDATE_GRID';

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
export const next = () => ({ type: NEXT, next: generateRandomPiece() });
export const scan = (scanned, end) => ({ type: SCAN, scanned, end });
export const updateDetached = detached => ({ type: UPDATE_DETACHED, detached });
export const updateGrid = grid => ({ type: UPDATE_GRID, grid });
