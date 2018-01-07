import { dimensions } from '../constants';
import { generateRandomPiece, normalize } from '../utils';

export const LOOP = 'LOOP';
export const ROTATE = 'ROTATE';
export const MOVE = 'MOVE';
export const DROP = 'DROP';
export const NEXT = 'NEXT';
export const DECOMPOSE = 'DECOMPOSE';
export const UPDATE_DETACHED = 'UPDATE_DETACHED';

export const loop = elapsed => ({ type: LOOP, elapsed });
export const rotate = direction => ({ type: ROTATE, direction });
export const move = direction => ({ type: MOVE, direction });
export const drop = () => ({ type: DROP });
export const next = () => ({ type: NEXT, colors: generateRandomPiece() });

export const decompose = piece => {
  const x = normalize(piece.x);
  const y = normalize(piece.y);
  return {
    type: DECOMPOSE,
    blocks: [
      { x, y, color: piece.blocks[0] },
      {
        x: x + dimensions.SQUARE_SIZE,
        y,
        color: piece.blocks[1],
      },
      {
        x: x + dimensions.SQUARE_SIZE,
        y: y + dimensions.SQUARE_SIZE,
        color: piece.blocks[2],
      },
      {
        x,
        y: y + dimensions.SQUARE_SIZE,
        color: piece.blocks[3],
      },
    ],
  };
};

export const updateDetached = (grid, detached) => ({
  type: UPDATE_DETACHED,
  grid,
  detached,
});
