export const UPDATE = 'UPDATE';
export const ROTATE = 'ROTATE';
export const MOVE = 'MOVE';
export const DROP = 'DROP';

export const update = elapsed => ({ type: UPDATE, elapsed });
export const rotate = direction => ({ type: ROTATE, direction });
export const move = direction => ({ type: MOVE, direction });
export const drop = () => ({ type: DROP });
