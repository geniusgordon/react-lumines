import { generateRandomPiece } from '../utils';

export const LOOP = 'LOOP';
export const ROTATE = 'ROTATE';
export const MOVE = 'MOVE';
export const DROP = 'DROP';
export const LOCK = 'LOCK';

export const loop = elapsed => ({ type: LOOP, elapsed });
export const rotate = direction => ({ type: ROTATE, direction });
export const move = direction => ({ type: MOVE, direction });
export const drop = () => ({ type: DROP });
export const lock = () => ({ type: LOCK, next: generateRandomPiece() });
