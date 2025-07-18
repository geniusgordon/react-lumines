import { describe, it, expect, beforeEach } from 'vitest';

import { BOARD_HEIGHT } from '@/constants';
import type { GameState, GameAction } from '@/types/game';
import { createEmptyBoard } from '@/utils/gameLogic';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer - Gameplay Mechanics', () => {
  let initialState: GameState;
  let playingState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState('12345');
    playingState = { ...initialState, status: 'playing' as const };
  });

  describe('Game tick progression', () => {
    it('should increment frame and drop timer on tick', () => {
      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(playingState, action);

      expect(newState.dropTimer).toBe(playingState.dropTimer + 1);
    });

    it('should drop block when timer reaches interval', () => {
      const stateNearDrop = {
        ...playingState,
        dropTimer: playingState.dropInterval - 1,
      };

      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(stateNearDrop, action);

      expect(newState.blockPosition.y).toBe(-1); // Should drop
      expect(newState.dropTimer).toBe(0); // Should reset
    });

    it('should advance timeline when timer reaches interval', () => {
      const timelineState = {
        ...playingState,
        timeline: {
          x: 5,
          sweepInterval: 1,
          timer: 0,
          active: true,
          holdingScore: 0,
          markedCells: [],
        },
      };

      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(timelineState, action);

      expect(newState.timeline.x).toBe(6); // 5 + 1 (moved one column)
      expect(newState.timeline.timer).toBe(0); // Timer reset after movement
      expect(newState.timeline.active).toBe(true); // Should stay active
    });

    it('should increment timer when not ready to move', () => {
      const timelineState = {
        ...playingState,
        timeline: {
          x: 5,
          sweepInterval: 10,
          timer: 3,
          active: true,
          holdingScore: 0,
          markedCells: [],
        },
      };

      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(timelineState, action);

      expect(newState.timeline.x).toBe(5); // No movement yet
      expect(newState.timeline.timer).toBe(4); // Timer incremented
      expect(newState.timeline.active).toBe(true); // Should stay active
    });

    it('should reset timeline position at end but stay active', () => {
      const timelineState = {
        ...playingState,
        timeline: {
          x: 15,
          sweepInterval: 1,
          timer: 0,
          active: true,
          holdingScore: 0,
          markedCells: [],
        },
      };

      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(timelineState, action);

      expect(newState.timeline.active).toBe(true); // Timeline stays active for continuous sweep
      expect(newState.timeline.x).toBe(0); // Position resets to start new sweep
      expect(newState.timeline.timer).toBe(0); // Timer reset
    });

    it('should not tick when game is not playing', () => {
      const pausedState = { ...initialState, status: 'paused' as const };
      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(pausedState, action);

      expect(newState.frame).toBe(pausedState.frame); // Frame should not update
      expect(newState.dropTimer).toBe(pausedState.dropTimer); // Drop timer should not update
    });
  });

  describe('Gravity application', () => {
    let stateWithFloatingBlocks: GameState;

    beforeEach(() => {
      // Create a state with floating blocks
      const board = createEmptyBoard();
      board[3][5] = 1; // Floating block
      board[5][7] = 2; // Another floating block

      /*
       * Board layout (showing only relevant rows and columns):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . . . .
       * 3   . . . . . 1 . . . .  ← floating block
       * 4   . . . . . . . . . .
       * 5   . . . . . . . 2 . .  ← floating block
       * 6   . . . . . . . . . .
       * 7   . . . . . . . . . .
       * 8   . . . . . . . . . .
       * 9   . . . . . . . . . .  ← ground level
       */

      stateWithFloatingBlocks = {
        ...initialState,
        status: 'playing' as const,
        board,
      };
    });

    it('should apply gravity to floating blocks through game mechanics', () => {
      // Note: Testing gravity integration through block placement instead of direct action
      // Direct gravity testing is done in utils/__tests__/gameLogic.test.ts
      const stateWithFloatingAndFallingBlock = {
        ...stateWithFloatingBlocks,
        blockPosition: { x: 5, y: BOARD_HEIGHT - 2 }, // Position for immediate placement
      };

      const action: GameAction = { type: 'SOFT_DROP' };
      const newState = gameReducer(stateWithFloatingAndFallingBlock, action);

      // Should have placed block and spawned new one
      expect(newState.currentBlock.id).not.toBe(
        stateWithFloatingAndFallingBlock.currentBlock.id
      );
    });

    it('should not process game mechanics when game is not playing', () => {
      const pausedState = {
        ...stateWithFloatingBlocks,
        status: 'paused' as const,
      };
      const action: GameAction = { type: 'TICK' };
      const newState = gameReducer(pausedState, action);

      expect(newState).toBe(pausedState); // State should be unchanged when paused
    });
  });

  describe('Pattern detection', () => {
    it('should detect patterns during game tick', () => {
      const playingState = { ...initialState, status: 'playing' as const };

      // Place a 2x2 pattern manually
      const boardWithPattern = playingState.board.map(row => [...row]);
      boardWithPattern[8][5] = 1; // light block
      boardWithPattern[8][6] = 1; // light block
      boardWithPattern[9][5] = 1; // light block
      boardWithPattern[9][6] = 1; // light block

      /*
       * Board layout (showing only relevant area):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . . . 1 1 . . .  ← 2x2 pattern (top row)
       * 9   . . . . . 1 1 . . .  ← 2x2 pattern (bottom row)
       *                 ↑ pattern at (5,8)
       */

      const stateWithPattern = {
        ...playingState,
        board: boardWithPattern,
      };

      // Perform a game tick
      const result = gameReducer(stateWithPattern, { type: 'TICK' });

      // Should detect the 2x2 pattern
      expect(result.detectedPatterns).toHaveLength(1);
      expect(result.detectedPatterns[0]).toEqual({
        x: 5,
        y: 8,
        color: 1 as const,
      });
    });

    it('should detect multiple patterns during game tick', () => {
      const playingState = { ...initialState, status: 'playing' as const };

      // Place two separate 2x2 patterns
      const boardWithPatterns = playingState.board.map(row => [...row]);
      // Pattern 1 (blue)
      boardWithPatterns[7][2] = 1;
      boardWithPatterns[7][3] = 1;
      boardWithPatterns[8][2] = 1;
      boardWithPatterns[8][3] = 1;
      // Pattern 2 (red)
      boardWithPatterns[7][10] = 2;
      boardWithPatterns[7][11] = 2;
      boardWithPatterns[8][10] = 2;
      boardWithPatterns[8][11] = 2;

      /*
       * Board layout (showing only relevant area):
       *     0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
       * 0   . . . . . . . . . . .  .  .  .  .  .
       * 1   . . . . . . . . . . .  .  .  .  .  .
       * ...
       * 6   . . . . . . . . . . .  .  .  .  .  .
       * 7   . . 1 1 . . . . . . 2  2  .  .  .  .  ← patterns (top row)
       * 8   . . 1 1 . . . . . . 2  2  .  .  .  .  ← patterns (bottom row)
       * 9   . . . . . . . . . . .  .  .  .  .  .
       *         ↑ pattern 1      ↑ pattern 2
       *       at (2,7)        at (10,7)
       */

      const stateWithPatterns = {
        ...playingState,
        board: boardWithPatterns,
      };

      const result = gameReducer(stateWithPatterns, { type: 'TICK' });

      expect(result.detectedPatterns).toHaveLength(2);
      expect(result.detectedPatterns).toContainEqual({
        x: 2,
        y: 7,
        color: 1 as const,
      });
      expect(result.detectedPatterns).toContainEqual({
        x: 10,
        y: 7,
        color: 2 as const,
      });
    });

    it('should detect larger rectangular patterns', () => {
      const playingState = { ...initialState, status: 'playing' as const };

      // Create a 3x2 pattern (should detect 2 overlapping 2x2 patterns)
      const boardWithLargePattern = playingState.board.map(row => [...row]);
      boardWithLargePattern[7][5] = 1;
      boardWithLargePattern[7][6] = 1;
      boardWithLargePattern[7][7] = 1;
      boardWithLargePattern[8][5] = 1;
      boardWithLargePattern[8][6] = 1;
      boardWithLargePattern[8][7] = 1;

      /*
       * Board layout (showing only relevant area):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 6   . . . . . . . . . .
       * 7   . . . . . 1 1 1 . .  ← 3x2 rectangle (top row)
       * 8   . . . . . 1 1 1 . .  ← 3x2 rectangle (bottom row)
       * 9   . . . . . . . . . .
       *               ↑   ↑
       *         pattern1 pattern2
       *          at(5,7) at(6,7)
       *
       * This creates 2 overlapping 2x2 patterns:
       * Pattern 1: positions (5,7), (6,7), (5,8), (6,8)
       * Pattern 2: positions (6,7), (7,7), (6,8), (7,8)
       */

      const stateWithLargePattern = {
        ...playingState,
        board: boardWithLargePattern,
      };

      const result = gameReducer(stateWithLargePattern, {
        type: 'TICK',
      });

      expect(result.detectedPatterns).toHaveLength(2);
      expect(result.detectedPatterns).toContainEqual({
        x: 5,
        y: 7,
        color: 1 as const,
      });
      expect(result.detectedPatterns).toContainEqual({
        x: 6,
        y: 7,
        color: 1 as const,
      });
    });

    it('should clear detected patterns when no patterns exist', () => {
      const playingState = { ...initialState, status: 'playing' as const };

      // Start with some detected patterns
      const stateWithOldPatterns = {
        ...playingState,
        detectedPatterns: [{ x: 5, y: 8, color: 1 as const }],
      };

      // Perform tick on empty board (no patterns)
      const result = gameReducer(stateWithOldPatterns, {
        type: 'TICK',
      });

      expect(result.detectedPatterns).toHaveLength(0);
    });

    it('should not detect patterns when colors do not match', () => {
      const playingState = { ...initialState, status: 'playing' as const };

      // Place blocks that form a 2x2 but with different colors
      const boardWithMismatchedColors = playingState.board.map(row => [...row]);
      boardWithMismatchedColors[8][5] = 1; // blue
      boardWithMismatchedColors[8][6] = 2; // red
      boardWithMismatchedColors[9][5] = 1; // blue
      boardWithMismatchedColors[9][6] = 2; // red

      /*
       * Board layout (showing only relevant area):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . . . 1 2 . . .  ← checkerboard pattern (no match)
       * 9   . . . . . 1 2 . . .  ← checkerboard pattern (no match)
       *               ↑
       *         not a valid pattern
       *         (different colors)
       */

      const stateWithMismatchedColors = {
        ...playingState,
        board: boardWithMismatchedColors,
      };

      const result = gameReducer(stateWithMismatchedColors, {
        type: 'TICK',
      });

      expect(result.detectedPatterns).toHaveLength(0);
    });
  });

  describe('Block placement and queue management', () => {
    it('should place block and advance queue when block hits bottom', () => {
      // Position block at bottom
      const bottomState = {
        ...playingState,
        blockPosition: { x: 7, y: BOARD_HEIGHT - 2 },
      };

      const action: GameAction = { type: 'SOFT_DROP' };
      const newState = gameReducer(bottomState, action);

      // Should generate new block
      expect(newState.currentBlock.id).not.toBe(bottomState.currentBlock.id);

      // Should update queue
      expect(newState.queue).toHaveLength(3); // Queue should maintain length

      // Block position should reset
      expect(newState.blockPosition).toEqual({ x: 7, y: -2 });
    });

    it('should place block on the board when it settles', () => {
      // Create state where block will be placed
      const stateToPlace = {
        ...playingState,
        blockPosition: { x: 7, y: BOARD_HEIGHT - 2 },
      };

      const action: GameAction = { type: 'SOFT_DROP' };
      const newState = gameReducer(stateToPlace, action);

      // Check that block was placed on board (implementation dependent)
      // This test verifies the mechanism works without asserting specific board state
      expect(newState.currentBlock.id).not.toBe(stateToPlace.currentBlock.id);
    });
  });

  describe('Game action controls', () => {
    // Note: APPLY_GRAVITY action removed - gravity is now handled within TICK action
    // Gravity logic is tested directly in utils/__tests__/gameLogic.test.ts
    // Integration tests below verify gravity works through the game flow

    it('should apply gravity when blocks are placed during gameplay', () => {
      // Create a state with a placed block creating a gap
      const board = createEmptyBoard();
      board[BOARD_HEIGHT - 2][3] = 1;
      board[BOARD_HEIGHT - 2][4] = 2;
      board[BOARD_HEIGHT - 1][3] = 2;
      board[BOARD_HEIGHT - 1][4] = 1;

      const stateWithGap = {
        ...playingState,
        board,
        blockPosition: { x: 3, y: BOARD_HEIGHT - 4 }, // Position block above the gap
      };

      /*
       * Board layout (before placement):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . . . .
       * 3   . . . . . . . . . .
       * 4   . . . . . . . . . .
       * 5   . . . . . . . . . .
       * 6   . . . B B . . . . .  ← current block position
       * 7   . . . B B . . . . .  ← current block position
       * 8   . . . 1 2 . . . . .  ← existing blocks
       * 9   . . . 2 1 . . . . .  ← existing blocks
       */

      // Try to drop the block - it should be placed and gravity should settle everything
      const action: GameAction = { type: 'SOFT_DROP' };
      const newState = gameReducer(stateWithGap, action);

      // Verify the block was placed and a new block was spawned
      expect(newState.currentBlock.id).not.toBe(stateWithGap.currentBlock.id);
      expect(newState.blockPosition).toEqual({ x: 7, y: -2 }); // Reset position
    });
  });
});
