import { generateRandomPiece } from '../utils';

export const LOOP = 'LOOP';
export const ROTATE = 'ROTATE';
export const MOVE = 'MOVE';
export const DROP = 'DROP';
export const NEXT = 'NEXT';
export const UPDATE_DETACHED = 'UPDATE_DETACHED';
export const UPDATE_GRID = 'UPDATE_GRID';
export const UPDATE_SCANNED = 'UPDATE_SCANNED';
export const REMOVE_SCANNED = 'REMOVE_SCANNED';

export const loop = (now, elapsed) => ({ type: LOOP, now, elapsed });
export const rotate = direction => ({ type: ROTATE, direction });
export const move = direction => ({ type: MOVE, direction });
export const drop = () => ({ type: DROP });
export const next = () => ({ type: NEXT, next: generateRandomPiece() });
export const updateDetached = detached => ({ type: UPDATE_DETACHED, detached });
export const updateGrid = (grid, matched) => ({ type: UPDATE_GRID, grid, matched });
export const updateScanned = (scanned, matched) => ({ type: UPDATE_SCANNED, scanned, matched });
export const removeScanned = (grid, detached) => ({ type: REMOVE_SCANNED, grid, detached });
