import { describe, it, expect, beforeEach } from 'vitest';

import type { GameState } from '@/types/game';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer - Timeline Processing', () => {
  let initialState: GameState;
  let playingState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState(12345);
    playingState = gameReducer(initialState, {
      type: 'START_GAME',
      frame: 0,
    });
  });

  describe('processTimelineColumn function behavior', () => {
    it('should mark cells and accumulate holding score when patterns are found in current column', () => {
      // Create state with patterns in column 3
      const boardWithPattern = playingState.board.map(row => [...row]);
      boardWithPattern[8][3] = 1; // 2x2 pattern starting at (3,8)
      boardWithPattern[8][4] = 1;
      boardWithPattern[9][3] = 1;
      boardWithPattern[9][4] = 1;

      /*
       * Board layout with timeline at column 3:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . 1 1 . . . . .  ← 2x2 pattern
       * 9   . . . 1 1 . . . . .  ← 2x2 pattern
       *           ↑ ↑
       *           | timeline here (column 3)
       *           pattern at (3,8)
       */

      const stateWithPattern = {
        ...playingState,
        board: boardWithPattern,
        detectedPatterns: [{ x: 3, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 3, // Timeline at column 3
          timer: playingState.timeline.speed - 1, // About to move
          holdingScore: 0
        },
        markedCells: [],
      };

      // Simulate timeline moving to next column (which triggers processing of column 3)
      const result = gameReducer(stateWithPattern, {
        type: 'TICK',
        frame: 1,
      });

      // Should accumulate holding score (1 point per pattern)
      expect(result.timeline.holdingScore).toBe(1);

      // Should mark cells for clearing (2 cells from the pattern in column 3)
      expect(result.markedCells).toHaveLength(2);
      expect(result.markedCells).toContainEqual({
        x: 3,
        y: 8,
        color: 1 as const,
      });
      expect(result.markedCells).toContainEqual({
        x: 3,
        y: 9,
        color: 1 as const,
      });
    });

    it('should clear marked cells and apply score when no patterns in current or previous column', () => {
      // Create state with holding score and marked cells, but no current patterns
      const stateWithHoldingScore = {
        ...playingState,
        detectedPatterns: [], // No current patterns

        /*
         * Timeline processing scenario:
         * - Timeline at column 5 (no patterns here)
         * - Previous columns 2,3,4 have marked cells from earlier patterns
         * - No patterns in current (5) or previous (4) column
         * - Should trigger clearing of all marked cells
         *
         * Board layout with marked cells (will be cleared):
         *     0 1 2 3 4 5 6 7 8 9
         * 0   . . . . . . . . . .
         * 1   . . . . . . . . . .
         * ...
         * 7   . . 2 . . . . . . .  ← will fall after clearing
         * 8   . . 1 1 . . . . . .  ← marked cells (will be cleared)
         * 9   . . 1 . . . . . . .  ← marked cells (will be cleared)
         *         ↑ ↑     ↑
         *       marked  timeline at column 5
         *       cells   (no patterns)
         */

        timeline: {
          ...playingState.timeline,
          x: 5, // Timeline at column 5 (no patterns)
          timer: playingState.timeline.speed - 1, // About to move
          holdingScore: 3, // Some accumulated score
        },
        markedCells: [
          { x: 2, y: 8, color: 1 as const },
          { x: 2, y: 9, color: 1 as const },
          { x: 3, y: 8, color: 1 as const },
        ],
      };

      // Put some blocks on the board that should be cleared
      const boardWithMarkedBlocks = stateWithHoldingScore.board.map(row => [
        ...row,
      ]);
      boardWithMarkedBlocks[8][2] = 1; // Should be cleared
      boardWithMarkedBlocks[9][2] = 1; // Should be cleared
      boardWithMarkedBlocks[8][3] = 1; // Should be cleared
      boardWithMarkedBlocks[7][2] = 2; // Should fall down after clearing

      const finalState = {
        ...stateWithHoldingScore,
        board: boardWithMarkedBlocks,
      };

      const result = gameReducer(finalState, { type: 'TICK', frame: 1 });

      // Should clear holding score by adding to main score
      expect(result.score).toBe(playingState.score + 3);
      expect(result.timeline.holdingScore).toBe(0);

      // Should clear marked cells
      expect(result.markedCells).toHaveLength(0);

      // Should apply gravity - block at [7][2] should fall down
      expect(result.board[8][2]).toBe(0); // Cleared
      expect(result.board[9][2]).toBe(2); // Block fell down
    });

    it('should not clear when patterns exist in previous column', () => {
      // Create state with patterns in previous column (4) when timeline is at column 5
      // When timeline moves from 5 to 6, it processes column 5 (no patterns)
      // Previous column 4 has patterns - clearing should NOT happen

      // Create board with actual blocks matching the pattern
      const boardWithPattern = playingState.board.map(row => [...row]);
      boardWithPattern[8][4] = 1; // Pattern at (4,8)
      boardWithPattern[8][5] = 1;
      boardWithPattern[9][4] = 1;
      boardWithPattern[9][5] = 1;

      /*
       * Timeline processing scenario:
       * - Timeline at column 5, moving to column 6
       * - Pattern exists in column 4 (previous column)
       * - Current column 5 has no patterns
       * - Should NOT clear because previous column has patterns
       *
       * Board layout:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . . 1 1 . . . .  ← pattern spans columns 4-5
       * 9   . . . . 1 1 . . . .  ← pattern spans columns 4-5
       *           ↑ ↑ ↑
       *           | | timeline at column 5
       *           | pattern starts at column 4 (previous)
       *           pattern detected at (4,8)
       */

      const stateWithPreviousPatterns = {
        ...playingState,
        board: boardWithPattern,
        detectedPatterns: [{ x: 4, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 5, // Timeline at column 5, pattern in previous column 4
          timer: playingState.timeline.speed - 1,
          holdingScore: 2,
        },
        markedCells: [
          { x: 2, y: 8, color: 1 as const },
          { x: 2, y: 9, color: 1 as const },
        ],
      };

      const result = gameReducer(stateWithPreviousPatterns, {
        type: 'TICK',
        frame: 1,
      });

      // Should NOT clear because column 4 (previous) has patterns
      // Timeline processes column 5 (current) which has no patterns, but column 4 (previous) has patterns
      expect(result.timeline.holdingScore).toBe(2); // Unchanged - no clearing
      expect(result.markedCells).toHaveLength(4); // 2 cells per pattern
      expect(result.score).toBe(playingState.score); // No score added
      expect(result.timeline.x).toBe(6); // Timeline should move forward
    });

    it('should handle multiple patterns in the same column', () => {
      // Create state with two patterns in column 5
      const boardWithMultiplePatterns = playingState.board.map(row => [...row]);
      // Pattern 1 at (5,6)
      boardWithMultiplePatterns[6][5] = 1;
      boardWithMultiplePatterns[6][6] = 1;
      boardWithMultiplePatterns[7][5] = 1;
      boardWithMultiplePatterns[7][6] = 1;
      // Pattern 2 at (5,8)
      boardWithMultiplePatterns[8][5] = 2;
      boardWithMultiplePatterns[8][6] = 2;
      boardWithMultiplePatterns[9][5] = 2;
      boardWithMultiplePatterns[9][6] = 2;

      /*
       * Board layout with multiple patterns:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 5   . . . . . . . . . .
       * 6   . . . . . 1 1 . . .  ← pattern 1 (top)
       * 7   . . . . . 1 1 . . .  ← pattern 1 (bottom)
       * 8   . . . . . 2 2 . . .  ← pattern 2 (top)
       * 9   . . . . . 2 2 . . .  ← pattern 2 (bottom)
       *             ↑
       *             timeline at column 5
       *
       * Two patterns detected:
       * - Pattern 1 at (5,6) with color 1
       * - Pattern 2 at (5,8) with color 2
       */

      const stateWithMultiplePatterns = {
        ...playingState,
        board: boardWithMultiplePatterns,
        detectedPatterns: [
          { x: 5, y: 6, color: 1 as const },
          { x: 5, y: 8, color: 2 as const },
        ],
        timeline: {
          ...playingState.timeline,
          x: 5,
          timer: playingState.timeline.speed - 1,
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(stateWithMultiplePatterns, {
        type: 'TICK',
        frame: 1,
      });

      // Should accumulate score for both patterns
      expect(result.timeline.holdingScore).toBe(2);

      // Should mark cells from both patterns
      expect(result.markedCells).toHaveLength(4); // 2 cells per pattern
      expect(result.markedCells).toContainEqual({
        x: 5,
        y: 6,
        color: 1 as const,
      });
      expect(result.markedCells).toContainEqual({
        x: 5,
        y: 7,
        color: 1 as const,
      });
      expect(result.markedCells).toContainEqual({
        x: 5,
        y: 8,
        color: 2 as const,
      });
      expect(result.markedCells).toContainEqual({
        x: 5,
        y: 9,
        color: 2 as const,
      });
    });

    it('should return unchanged state when no patterns and no holding score', () => {
      const stateWithNoPatterns = {
        ...playingState,
        detectedPatterns: [],
        timeline: {
          ...playingState.timeline,
          x: 5,
          timer: playingState.timeline.speed - 1,
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(stateWithNoPatterns, {
        type: 'TICK',
        frame: 1,
      });

      // Timeline should move but no clearing should happen
      expect(result.timeline.holdingScore).toBe(0);
      expect(result.markedCells).toHaveLength(0);
      expect(result.score).toBe(playingState.score);
      expect(result.board).toEqual(playingState.board);
    });

    it('should handle timeline wrapping around board edge', () => {
      // Test timeline at last column (15) wrapping to column 0
      const stateAtEdge = {
        ...playingState,
        detectedPatterns: [],

        /*
         * Timeline at board edge scenario:
         *     ... 12 13 14 15  0  1  2 ...
         * 0   ... .  .  .  .   .  .  . ...
         * 1   ... .  .  .  .   .  .  . ...
         * ...
         * 8   ... .  .  1  .   .  .  . ...  ← marked cell at column 14
         * 9   ... .  .  .  .   .  .  . ...
         *              ↑  ↑   ↑
         *              |  |   wraps to here (column 0)
         *              |  timeline at column 15 (last column)
         *              marked cell (will be cleared when wrapping)
         */

        timeline: {
          ...playingState.timeline,
          x: 15, // Last column
          timer: playingState.timeline.speed - 1,
          holdingScore: 1
        },
        markedCells: [{ x: 14, y: 8, color: 1 as const }],
      };

      const result = gameReducer(stateAtEdge, { type: 'TICK', frame: 1 });

      // Timeline should wrap to column 0
      expect(result.timeline.x).toBe(0);

      // Should clear since no patterns in current (15) or previous (14) column
      expect(result.timeline.holdingScore).toBe(0);
      expect(result.score).toBe(playingState.score + 1);
    });

    it('should accumulate cells from patterns in previous column when marking', () => {
      // Create state with pattern in previous column (4) when timeline is at column 5
      const boardWithPreviousPattern = playingState.board.map(row => [...row]);
      boardWithPreviousPattern[8][4] = 1; // Pattern at (4,8)
      boardWithPreviousPattern[8][5] = 1;
      boardWithPreviousPattern[9][4] = 1;
      boardWithPreviousPattern[9][5] = 1;

      /*
       * Pattern in previous column scenario:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . . 1 1 . . . .  ← pattern spans columns 4-5
       * 9   . . . . 1 1 . . . .  ← pattern spans columns 4-5
       *           ↑ ↑ ↑
       *           | | timeline at column 5
       *           | already marked as processed
       *           pattern at (4,8) in previous column
       */

      const stateWithPreviousPattern = {
        ...playingState,
        board: boardWithPreviousPattern,
        detectedPatterns: [{ x: 4, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 5, // Timeline at column 5, pattern in previous column 4
          timer: playingState.timeline.speed - 1,
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(stateWithPreviousPattern, {
        type: 'TICK',
        frame: 1,
      });

      // Should not clear but should still process timeline movement
      expect(result.timeline.x).toBe(6); // Timeline moved forward
      expect(result.timeline.holdingScore).toBe(0); // No new score added
      expect(result.score).toBe(playingState.score); // No score cleared
    });
  });

  describe('Timeline movement integration', () => {
    it('should process column when timeline timer reaches speed threshold', () => {
      const stateWithPattern = {
        ...playingState,
        board: playingState.board.map((row, y) =>
          row.map((cell, x) => {
            // Create a 2x2 pattern at (3,8)
            if ((x === 3 || x === 4) && (y === 8 || y === 9)) {
              return 1 as const;
            }
            return cell;
          })
        ),
        detectedPatterns: [{ x: 3, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 3,
          timer: playingState.timeline.speed - 1, // One frame before moving
          // Use default speed (10 frames from config)
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(stateWithPattern, {
        type: 'TICK',
        frame: 1,
      });

      // Timeline should move and process the column
      expect(result.timeline.x).toBe(4);
      expect(result.timeline.timer).toBe(0);
      expect(result.timeline.holdingScore).toBe(1);
      expect(result.markedCells.length).toBeGreaterThan(0);
    });

    it('should not process column when timeline timer has not reached threshold', () => {
      const stateWithPattern = {
        ...playingState,
        timeline: {
          ...playingState.timeline,
          x: 3,
          timer: 5, // Not at threshold yet (default speed is 10)
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(stateWithPattern, {
        type: 'TICK',
        frame: 1,
      });

      // Timeline should not move, just increment timer
      expect(result.timeline.x).toBe(3);
      expect(result.timeline.timer).toBe(6);
      expect(result.timeline.holdingScore).toBe(0);
    });
  });

  describe('Timeline edge cases', () => {
    it('should handle patterns at board edges correctly', () => {
      // Test pattern at left edge (column 0)
      const boardWithEdgePattern = playingState.board.map(row => [...row]);
      boardWithEdgePattern[8][0] = 1; // Pattern at (0,8)
      boardWithEdgePattern[8][1] = 1;
      boardWithEdgePattern[9][0] = 1;
      boardWithEdgePattern[9][1] = 1;

      /*
       * Pattern at board edge:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   1 1 . . . . . . . .  ← pattern at left edge
       * 9   1 1 . . . . . . . .  ← pattern at left edge
       *     ↑ ↑
       *     | timeline at column 0 (left edge)
       *     pattern at (0,8)
       */

      const stateWithEdgePattern = {
        ...playingState,
        board: boardWithEdgePattern,
        detectedPatterns: [{ x: 0, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 0, // Timeline at column 0
          timer: playingState.timeline.speed - 1,
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(stateWithEdgePattern, {
        type: 'TICK',
        frame: 1,
      });

      // Should process normally even at edge
      expect(result.timeline.holdingScore).toBe(1);
      expect(result.markedCells).toHaveLength(2);
    });

    it('should handle timeline at right edge (column 15)', () => {
      // Test timeline at right edge
      const stateAtRightEdge = {
        ...playingState,
        detectedPatterns: [],
        timeline: {
          ...playingState.timeline,
          x: 15, // Last column
          timer: playingState.timeline.speed - 1,
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(stateAtRightEdge, {
        type: 'TICK',
        frame: 1,
      });

      // Should wrap around to column 0
      expect(result.timeline.x).toBe(0);
      expect(result.timeline.timer).toBe(0);
    });

    it('should handle complex clearing scenarios with multiple marked columns', () => {
      // Create state with many marked columns and holding score
      const stateWithComplexMarking = {
        ...playingState,
        detectedPatterns: [], // No current patterns to trigger clearing

        /*
         * Complex clearing scenario:
         * - Timeline at column 10 (far from marked areas)
         * - Multiple marked columns (2,3,4,5,6) from previous patterns
         * - No current patterns at timeline position
         * - Should clear all accumulated marked cells and score
         *
         * Board layout with marked cells:
         *     0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
         * 0   . . . . . . . . . . .  .  .  .  .  .
         * 1   . . . . . . . . . . .  .  .  .  .  .
         * ...
         * 7   . . . . . . . . . . .  .  .  .  .  .
         * 8   . . M M M M M . . . .  .  .  .  .  .  ← marked cells (M)
         * 9   . . . . . . . . . . .  .  .  .  .  .
         *         ↑ ↑ ↑ ↑ ↑       ↑
         *         marked cells    timeline at column 10
         *         columns 2-6     (no patterns here)
         */

        timeline: {
          ...playingState.timeline,
          x: 10, // Timeline far from marked columns
          timer: playingState.timeline.speed - 1,
          holdingScore: 5
        },
        markedCells: [
            { x: 2, y: 8, color: 1 as const },
            { x: 3, y: 8, color: 1 as const },
            { x: 4, y: 8, color: 2 as const },
            { x: 5, y: 8, color: 2 as const },
            { x: 6, y: 8, color: 1 as const },
          ],
      };

      const result = gameReducer(stateWithComplexMarking, {
        type: 'TICK',
        frame: 1,
      });

      // Should clear all marked cells and apply score
      expect(result.timeline.holdingScore).toBe(0);
      expect(result.markedCells).toHaveLength(0);
      expect(result.score).toBe(playingState.score + 5);
    });
  });

  describe('Timeline speed variations', () => {
    it('should handle different timeline speeds', () => {
      const slowTimelineState = {
        ...playingState,
        timeline: {
          ...playingState.timeline,
          x: 5,
          speed: 30, // Very slow timeline
          timer: 29, // One frame before moving
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(slowTimelineState, {
        type: 'TICK',
        frame: 1,
      });

      // Should move after 30 frames
      expect(result.timeline.x).toBe(6);
      expect(result.timeline.timer).toBe(0);
    });

    it('should handle fast timeline speeds', () => {
      const fastTimelineState = {
        ...playingState,
        timeline: {
          ...playingState.timeline,
          x: 5,
          speed: 1, // Very fast timeline
          timer: 0, // Ready to move immediately
          holdingScore: 0
        },
        markedCells:  [],
      };

      const result = gameReducer(fastTimelineState, {
        type: 'TICK',
        frame: 1,
      });

      // Should move every frame
      expect(result.timeline.x).toBe(6);
      expect(result.timeline.timer).toBe(0);
    });
  });
});
