import { decompose, DECOMPOSE } from '../';
import { dimensions } from '../../constants';

describe('decompose action creator', () => {
  it('should work with integer x, y', () => {
    const piece = { x: 0, y: 0, blocks: [0, 0, 0, 0] };
    expect(decompose(piece)).toEqual({
      type: DECOMPOSE,
      blocks: [
        { x: 0, y: 0, color: 0 },
        { x: dimensions.SQUARE_SIZE, y: 0, color: 0 },
        { x: dimensions.SQUARE_SIZE, y: dimensions.SQUARE_SIZE, color: 0 },
        { x: 0, y: dimensions.SQUARE_SIZE, color: 0 },
      ],
    });
  });
  it('should work with float x, y', () => {
    const piece = { x: 0.5, y: 0.5, blocks: [0, 0, 0, 0] };
    expect(decompose(piece)).toEqual({
      type: DECOMPOSE,
      blocks: [
        { x: 0, y: 0, color: 0 },
        { x: dimensions.SQUARE_SIZE, y: 0, color: 0 },
        { x: dimensions.SQUARE_SIZE, y: dimensions.SQUARE_SIZE, color: 0 },
        { x: 0, y: dimensions.SQUARE_SIZE, color: 0 },
      ],
    });
  });
});
