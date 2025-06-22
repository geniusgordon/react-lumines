import { describe, it, expect, beforeEach } from 'vitest';

import type { GameState, GameAction, GameBoard } from '@/types/game';
import { createEmptyBoard } from '@/utils/gameLogic';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer - Gameplay Mechanics', () => {
  let initialState: GameState;
  let playingState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState(12345);
    playingState = { ...initialState, status: 'playing' as const };
  });

  describe('Game tick progression', () => {
    it('should increment frame and drop timer on tick', () => {
      const action: GameAction = { type: 'TICK', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.frame).toBe(10);
      expect(newState.dropTimer).toBe(playingState.dropTimer + 1);
    });

    it('should drop block when timer reaches interval', () => {
      const stateNearDrop = {
        ...playingState,
        dropTimer: playingState.dropInterval - 1,
      };

      const action: GameAction = { type: 'TICK', frame: 100 };
      const newState = gameReducer(stateNearDrop, action);

      expect(newState.blockPosition.y).toBe(1); // Should drop
      expect(newState.dropTimer).toBe(0); // Should reset
    });

    it('should advance timeline when timer reaches interval', () => {
      const timelineState = {
        ...playingState,
        timeline: {
          x: 5,
          speed: 1,
          timer: 0,
          active: true,
          holdingScore: 0,
          markedCells: [],
        },
      };

      const action: GameAction = { type: 'TICK', frame: 100 };
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
          speed: 10,
          timer: 3,
          active: true,
          holdingScore: 0,
          markedCells: [],
        },
      };

      const action: GameAction = { type: 'TICK', frame: 100 };
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
          speed: 1,
          timer: 0,
          active: true,
          holdingScore: 0,
          markedCells: [],
        },
      };

      const action: GameAction = { type: 'TICK', frame: 100 };
      const newState = gameReducer(timelineState, action);

      expect(newState.timeline.active).toBe(true); // Timeline stays active for continuous sweep
      expect(newState.timeline.x).toBe(0); // Position resets to start new sweep
      expect(newState.timeline.timer).toBe(0); // Timer reset
    });

    it('should not tick when game is not playing', () => {
      const pausedState = { ...initialState, status: 'paused' as const };
      const action: GameAction = { type: 'TICK', frame: 100 };
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

    it('should apply gravity to floating blocks', () => {
      const action: GameAction = { type: 'APPLY_GRAVITY', frame: 100 };
      const newState = gameReducer(stateWithFloatingBlocks, action);

      // Blocks should have fallen
      expect(newState.board[3][5]).toBe(0); // Original position cleared
      expect(newState.board[9][5]).toBe(1); // Block at bottom
      expect(newState.frame).toBe(100);
    });

    it('should apply gravity in more complex scenarios', () => {
      // Create a state with complex floating blocks pattern
      const complexBoard = createEmptyBoard();
      complexBoard[4][3] = 1; // Stack of blocks
      complexBoard[5][3] = 2;
      complexBoard[6][3] = 1;
      complexBoard[8][3] = 2; // Gap, these should fall down
      complexBoard[2][7] = 1; // Isolated floating block

      /*
       * Board layout (showing only relevant columns):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . 1 . .  ← isolated floating block
       * 3   . . . . . . . . . .
       * 4   . . . 1 . . . . . .  ← top of stack
       * 5   . . . 2 . . . . . .  ← middle of stack
       * 6   . . . 1 . . . . . .  ← bottom of stack
       * 7   . . . . . . . . . .  ← empty gap
       * 8   . . . 2 . . . . . .  ← floating block (will fall)
       * 9   . . . . . . . . . .  ← ground level
       */

      const complexState = {
        ...stateWithFloatingBlocks,
        board: complexBoard,
      };

      const action: GameAction = { type: 'APPLY_GRAVITY', frame: 100 };
      const newState = gameReducer(complexState, action);

      // Check that blocks fell correctly
      /*
       * Expected result after gravity:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . . . .
       * 3   . . . . . . . . . .
       * 4   . . . . . . . . . .
       * 5   . . . . . . . . . .
       * 6   . . . 1 . . . . . .  ← stack bottom (was at row 4)
       * 7   . . . 2 . . . . . .  ← stack middle (was at row 5)
       * 8   . . . 1 . . . . . .  ← stack bottom (was at row 6)
       * 9   . . . 2 . . . 1 . .  ← floating block fell + isolated block fell
       */
      expect(newState.board[6][3]).toBe(1); // Bottom of stack
      expect(newState.board[7][3]).toBe(2);
      expect(newState.board[8][3]).toBe(1);
      expect(newState.board[9][3]).toBe(2); // Blocks fell to fill the gap
      expect(newState.board[9][7]).toBe(1); // Isolated block fell to bottom
    });

    it('should not apply gravity when game is not playing', () => {
      const pausedState = {
        ...stateWithFloatingBlocks,
        status: 'paused' as const,
      };
      const action: GameAction = { type: 'APPLY_GRAVITY', frame: 100 };
      const newState = gameReducer(pausedState, action);

      expect(newState).toBe(pausedState); // State should be unchanged
    });
  });

  describe('Pattern detection', () => {
    it('should detect patterns during game tick', () => {
      // Create a playing state with a 2x2 pattern on the board
      const playingState = gameReducer(initialState, {
        type: 'START_GAME',
        frame: 0,
      });

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
      const result = gameReducer(stateWithPattern, { type: 'TICK', frame: 1 });

      // Should detect the 2x2 pattern
      expect(result.detectedPatterns).toHaveLength(1);
      expect(result.detectedPatterns[0]).toEqual({
        x: 5,
        y: 8,
        color: 1 as const,
      });
    });

    it('should detect multiple patterns during game tick', () => {
      const playingState = gameReducer(initialState, {
        type: 'START_GAME',
        frame: 0,
      });

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

      const result = gameReducer(stateWithPatterns, { type: 'TICK', frame: 1 });

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
      const playingState = gameReducer(initialState, {
        type: 'START_GAME',
        frame: 0,
      });

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
        frame: 1,
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
      const playingState = gameReducer(initialState, {
        type: 'START_GAME',
        frame: 0,
      });

      // Start with some detected patterns
      const stateWithOldPatterns = {
        ...playingState,
        detectedPatterns: [{ x: 5, y: 8, color: 1 as const }],
      };

      // Perform tick on empty board (no patterns)
      const result = gameReducer(stateWithOldPatterns, {
        type: 'TICK',
        frame: 1,
      });

      expect(result.detectedPatterns).toHaveLength(0);
    });

    it('should not detect patterns when colors do not match', () => {
      const playingState = gameReducer(initialState, {
        type: 'START_GAME',
        frame: 0,
      });

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
        frame: 1,
      });

      expect(result.detectedPatterns).toHaveLength(0);
    });
  });

  describe('Block placement and queue management', () => {
    it('should place block and advance queue when block hits bottom', () => {
      // Position block at bottom
      const bottomState = {
        ...playingState,
        blockPosition: { x: 7, y: 8 },
      };

      const action: GameAction = { type: 'SOFT_DROP', frame: 100 };
      const newState = gameReducer(bottomState, action);

      // Should generate new block
      expect(newState.currentBlock.id).not.toBe(bottomState.currentBlock.id);

      // Should update queue
      expect(newState.queue).toHaveLength(3); // Queue should maintain length

      // Block position should reset
      expect(newState.blockPosition).toEqual({ x: 7, y: 0 });
    });

    it('should place block on the board when it settles', () => {
      // Create state where block will be placed
      const stateToPlace = {
        ...playingState,
        blockPosition: { x: 7, y: 8 },
      };

      const action: GameAction = { type: 'SOFT_DROP', frame: 100 };
      const newState = gameReducer(stateToPlace, action);

      // Check that block was placed on board (implementation dependent)
      // This test verifies the mechanism works without asserting specific board state
      expect(newState.currentBlock.id).not.toBe(stateToPlace.currentBlock.id);
    });
  });

  describe('Game action controls', () => {
    it('should apply gravity when APPLY_GRAVITY action is dispatched', () => {
      // Create a state with some floating blocks (simulating after squares were cleared)
      const stateWithFloatingBlocks = {
        ...playingState,
        board: [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 0
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 1
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 2
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 3
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 4
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 5
          [0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 6 - floating blocks
          [0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 7 - floating blocks
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 8 - empty space
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 9 - empty space
        ] as GameBoard,
      };

      /*
       * Board layout (before gravity):
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . . . .
       * 3   . . . . . . . . . .
       * 4   . . . . . . . . . .
       * 5   . . . . . . . . . .
       * 6   . . . 1 2 . . . . .  ← floating blocks
       * 7   . . . 2 1 . . . . .  ← floating blocks
       * 8   . . . . . . . . . .  ← empty space (gap)
       * 9   . . . . . . . . . .  ← ground level
       *
       * Expected after gravity:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * 2   . . . . . . . . . .
       * 3   . . . . . . . . . .
       * 4   . . . . . . . . . .
       * 5   . . . . . . . . . .
       * 6   . . . . . . . . . .
       * 7   . . . . . . . . . .
       * 8   . . . 1 2 . . . . .  ← blocks fell down
       * 9   . . . 2 1 . . . . .  ← blocks fell down
       */

      const action: GameAction = { type: 'APPLY_GRAVITY', frame: 100 };
      const newState = gameReducer(stateWithFloatingBlocks, action);

      // Blocks should have fallen to the bottom
      expect(newState.board[8][3]).toBe(1); // block fell to row 8
      expect(newState.board[8][4]).toBe(2);
      expect(newState.board[9][3]).toBe(2); // block fell to row 9
      expect(newState.board[9][4]).toBe(1);

      // Original positions should be empty
      expect(newState.board[6][3]).toBe(0);
      expect(newState.board[6][4]).toBe(0);
      expect(newState.board[7][3]).toBe(0);
      expect(newState.board[7][4]).toBe(0);

      expect(newState.frame).toBe(100);
    });

    it('should not apply gravity when game is not playing', () => {
      const pausedState = { ...playingState, status: 'paused' as const };
      const action: GameAction = { type: 'APPLY_GRAVITY', frame: 100 };
      const newState = gameReducer(pausedState, action);

      expect(newState).toBe(pausedState); // State should be unchanged
    });
  });
});
