import { describe, it, expect } from 'vitest';

import { gameState } from '@/reducers/__tests__/fixtures';
import { gameReducer } from '@/reducers/gameReducer';
import type { GameAction } from '@/types/game';

describe('Timeline Fixtures - GameReducer Tests', () => {
  describe('Timeline advancing with falling columns', () => {
    const fixtureState = gameState;

    it('should have correct falling columns on next TICK', () => {
      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(fixtureState, action);

      // Timeline should advance from x=10 to x=11 (or wrap to 0 if at edge)
      expect(newState.timeline.x).toBe(11);
      expect(newState.timeline.timer).toBe(0);

      for (const column of newState.fallingColumns) {
        const cellIds = column.cells.map(cell => cell.id);
        const uniqueIds = new Set(cellIds);
        expect(uniqueIds.size).toBe(cellIds.length);
      }
    });
  });
});
