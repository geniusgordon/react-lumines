import { describe, it, expect } from 'vitest';

import { BOARD_WIDTH, TIMER_CONFIG } from '@/constants';
import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type {
  GameAction,
  CellValue,
  GameActionType,
  GameStatus,
} from '@/types/game';
import { SeededRNG } from '@/utils/seededRNG/seededRNG';

describe('Integration Tests', () => {
  describe('End-to-end game simulation', () => {
    it('should handle complete game flow deterministically', () => {
      const seed = '12345';
      const state1 = createInitialGameState(seed);
      const state2 = createInitialGameState(seed);

      // Simulate identical game sequences
      const actions: GameAction[] = [
        { type: 'START_GAME' },
        { type: 'MOVE_LEFT' },
        { type: 'ROTATE_CW' },
        { type: 'HARD_DROP' },
        { type: 'MOVE_RIGHT' },
        { type: 'HARD_DROP' },
      ];

      let finalState1 = state1;
      let finalState2 = state2;

      for (const action of actions) {
        finalState1 = gameReducer(finalState1, action);
        finalState2 = gameReducer(finalState2, action);
      }

      // States should be identical due to determinism
      expect(finalState1.board).toEqual(finalState2.board);
      expect(finalState1.score).toBe(finalState2.score);
      expect(finalState1.currentBlock.pattern).toEqual(
        finalState2.currentBlock.pattern
      );
    });

    it('should handle multiple game ticks correctly', () => {
      const state = createInitialGameState('12345');
      let currentState = { ...state, status: 'playing' as GameStatus };

      const initialPosition = currentState.blockPosition;
      const dropInterval = currentState.dropInterval;

      // Simulate multiple ticks without reaching drop interval
      for (let i = 1; i < dropInterval; i++) {
        currentState = gameReducer(currentState, { type: 'TICK' });
        expect(currentState.frame).toBe(i);
        expect(currentState.dropTimer).toBe(i);
        expect(currentState.blockPosition).toEqual(initialPosition);
      }

      // Next tick should trigger a drop
      currentState = gameReducer(currentState, {
        type: 'TICK',
      });

      expect(currentState.blockPosition.y).toBe(initialPosition.y + 1);
      expect(currentState.dropTimer).toBe(0);
    });

    it('should maintain RNG determinism across actions', () => {
      const rng1 = new SeededRNG('12345');
      const rng2 = new SeededRNG('12345');

      // Generate identical sequences
      const sequence1 = [];
      const sequence2 = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence1).toEqual(sequence2);

      // Reset and verify
      rng1.reset();
      rng2.reset();

      expect(rng1.next()).toBe(rng2.next());
    });

    it('should handle game over conditions', () => {
      const state = createInitialGameState('12345');
      let currentState = { ...state, status: 'playing' as GameStatus };

      // Fill the top rows of the board to create a realistic game over scenario
      // This simulates blocks stacking up to the point where new blocks can't spawn
      const board = currentState.board.map(row => [...row]);

      // Fill top 3 rows completely - this makes it impossible for any new block to spawn
      // since even with y=-2, part of the block needs to be visible (y>=0)
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 16; x++) {
          board[y][x] = 1 as CellValue;
        }
      }

      /*
       * Enhanced game over scenario - no space for new block spawn:
       * With top 3 rows filled and initial spawn at y=-2,
       * no part of any new block can be placed since it requires
       * at least some part to be visible (y >= 0)
       */

      currentState = { ...currentState, board };

      // Try to place a new block (should trigger game over since no space exists for spawn)
      const finalState = gameReducer(currentState, {
        type: 'HARD_DROP',
      });

      expect(finalState.status).toBe('gameOver');
    });

    it('should handle timeline sweep correctly', () => {
      const state = createInitialGameState('12345');
      let currentState = { ...state, status: 'playing' as GameStatus };

      // Timeline should already be active with frame-based timing
      expect(currentState.timeline.active).toBe(true);
      expect(currentState.timeline.x).toBe(0);
      expect(currentState.timeline.timer).toBe(0);

      // Advance timeline through multiple ticks (speed = TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL frames per column)
      for (let i = 0; i < TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL; i++) {
        currentState = gameReducer(currentState, {
          type: 'TICK',
        });

        if (i === TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL - 1) {
          // After TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL ticks, timeline should move to column 1
          expect(currentState.timeline.x).toBe(1);
          expect(currentState.timeline.timer).toBe(0); // Timer reset
        } else {
          // Before TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL ticks, timeline should stay at column 0 with increasing timer
          expect(currentState.timeline.x).toBe(0);
          expect(currentState.timeline.timer).toBe(i + 1);
        }
        expect(currentState.timeline.active).toBe(true);
      }

      // Test timeline reset at end (simulate reaching x=15 and moving to x=16)
      currentState = {
        ...currentState,
        timeline: {
          ...currentState.timeline,
          x: BOARD_WIDTH - 1,
          timer: TIMER_CONFIG.TIMELINE_SWEEP_INTERVAL - 1,
        },
      };

      currentState = gameReducer(currentState, {
        type: 'TICK',
      });

      expect(currentState.timeline.active).toBe(true); // Timeline stays active for continuous sweep
      expect(currentState.timeline.x).toBe(0); // Position resets to start new sweep
      expect(currentState.timeline.timer).toBe(0); // Timer reset
    });
  });

  describe('Performance and consistency', () => {
    it('should handle large numbers of actions efficiently', () => {
      const state = createInitialGameState('12345');
      let currentState = { ...state, status: 'playing' as GameStatus };

      const startTime = performance.now();

      // Process 1000 tick actions
      for (let i = 1; i <= 1000; i++) {
        currentState = gameReducer(currentState, { type: 'TICK' });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(currentState.frame).toBe(1000);
      expect(duration).toBeLessThan(500);
    });

    it('should maintain state consistency across complex operations', () => {
      const state = createInitialGameState('12345');
      let currentState = { ...state, status: 'playing' as GameStatus };

      // Perform a complex sequence of operations
      const operations = [
        'MOVE_LEFT',
        'MOVE_RIGHT',
        'ROTATE_CW',
        'ROTATE_CCW',
        'SOFT_DROP',
        'MOVE_LEFT',
        'ROTATE_CW',
        'HARD_DROP',
        'TICK',
        'TICK',
        'TICK',
      ];

      for (const operation of operations) {
        const previousState = { ...currentState };
        currentState = gameReducer(currentState, {
          type: operation as GameActionType,
        });

        // Verify immutability
        expect(currentState).not.toBe(previousState);
        if (currentState.board !== previousState.board) {
          expect(currentState.board).not.toBe(previousState.board);
        }
      }

      expect(currentState.status).toBe('playing');
    });
  });

  describe('Error resilience', () => {
    it('should maintain valid board state after all operations', () => {
      const state = createInitialGameState('12345');
      let currentState = { ...state, status: 'playing' as GameStatus };

      // Perform random operations
      const rng = new SeededRNG('54321');
      const actions = [
        'MOVE_LEFT',
        'MOVE_RIGHT',
        'ROTATE_CW',
        'SOFT_DROP',
        'TICK',
      ];

      for (let i = 0; i < 50; i++) {
        const action = rng.choice(actions);
        currentState = gameReducer(currentState, {
          type: action as GameActionType,
        });

        // Verify board integrity
        expect(currentState.board).toHaveLength(10);
        expect(currentState.board[0]).toHaveLength(16);

        // Verify all cells contain valid values
        for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 16; x++) {
            expect([0, 1, 2]).toContain(currentState.board[y][x]);
          }
        }

        // Verify position bounds
        expect(currentState.blockPosition.x).toBeGreaterThanOrEqual(0);
        expect(currentState.blockPosition.x).toBeLessThan(16);
        expect(currentState.blockPosition.y).toBeGreaterThanOrEqual(-2);
        expect(currentState.blockPosition.y).toBeLessThan(10);
      }
    });
  });
});
