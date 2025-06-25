import { describe, it, expect, beforeEach } from 'vitest';

import type { GameState } from '@/types/game';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer - Timeline Processing', () => {
  let initialState: GameState;
  let playingState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState('12345');
    playingState = { ...initialState, status: 'playing' as const };
  });

  describe('processTimelineColumn function behavior', () => {
    it('should mark cells and accumulate holding score when timeline enters a column with patterns', () => {
      // Create state with patterns in column 4
      const boardWithPattern = playingState.board.map(row => [...row]);
      boardWithPattern[8][4] = 1; // 2x2 pattern starting at (4,8)
      boardWithPattern[8][5] = 1;
      boardWithPattern[9][4] = 1;
      boardWithPattern[9][5] = 1;

      /*
       * Board layout with timeline entering column 4:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . . 1 1 . . . .  ← 2x2 pattern
       * 9   . . . . 1 1 . . . .  ← 2x2 pattern
       *           ↑ ↑
       *           | timeline moving to column 4 (with pattern)
       *           pattern at (4,8)
       */

      const stateWithPattern = {
        ...playingState,
        board: boardWithPattern,
        detectedPatterns: [{ x: 4, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 3, // Timeline at column 3, about to move to column 4
          timer: playingState.timeline.sweepInterval - 1, // About to move
          holdingScore: 0,
        },
        markedCells: [],
      };

      // Simulate timeline moving to column 4 (which triggers processing of column 4)
      const result = gameReducer(stateWithPattern, {
        type: 'TICK',
      });

      // Should accumulate holding score (1 point per pattern)
      expect(result.timeline.holdingScore).toBe(1);

      // Should mark cells for clearing (2 cells from the pattern in column 4)
      expect(result.markedCells).toHaveLength(2);
      expect(result.markedCells).toContainEqual({
        x: 4,
        y: 8,
        color: 1 as const,
      });
      expect(result.markedCells).toContainEqual({
        x: 4,
        y: 9,
        color: 1 as const,
      });

      // Timeline should have moved to column 4
      expect(result.timeline.x).toBe(4);
    });

    it('should clear marked cells and apply score when timeline enters a column with no patterns', () => {
      // Create state with holding score and marked cells, but timeline entering empty column
      const stateWithHoldingScore = {
        ...playingState,
        detectedPatterns: [], // No patterns in the column being entered

        /*
         * Timeline processing scenario:
         * - Timeline at column 4, moving to column 5 (no patterns in column 5)
         * - Previous columns 2,3,4 have marked cells from earlier patterns
         * - No patterns in column 5 (being entered) or column 4 (previous)
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
         *         ↑ ↑   ↑
         *       marked  timeline entering column 5
         *       cells   (no patterns)
         */

        timeline: {
          ...playingState.timeline,
          x: 4, // Timeline at column 4, about to enter column 5 (no patterns)
          timer: playingState.timeline.sweepInterval - 1, // About to move
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

      const result = gameReducer(finalState, { type: 'TICK' });

      // Should clear holding score by adding to main score
      expect(result.score).toBe(playingState.score + 3);
      expect(result.timeline.holdingScore).toBe(0);

      // Should clear marked cells
      expect(result.markedCells).toHaveLength(0);

      // Should apply gravity - block at [7][2] should fall down
      expect(result.board[8][2]).toBe(0); // Cleared
      expect(result.fallingColumns[0].x).toBe(2);
      expect(result.fallingColumns[0].cells).toHaveLength(1);
      expect(result.fallingColumns[0].cells[0].y).toBe(7);
      expect(result.fallingColumns[0].cells[0].color).toBe(2);
      expect(result.fallingColumns[0].timer).toBe(1);

      // Timeline should have moved to column 5
      expect(result.timeline.x).toBe(5);
    });

    it('should not clear when patterns exist in column being entered', () => {
      // Create state with patterns in column 5 (the column timeline is entering)
      // When timeline moves from 4 to 5, it processes column 5 (has patterns)
      // Should NOT clear because the column being entered has patterns

      // Create board with actual blocks matching the pattern
      const boardWithPattern = playingState.board.map(row => [...row]);
      boardWithPattern[8][5] = 1; // Pattern at (5,8)
      boardWithPattern[8][6] = 1;
      boardWithPattern[9][5] = 1;
      boardWithPattern[9][6] = 1;

      /*
       * Timeline processing scenario:
       * - Timeline at column 4, moving to column 5
       * - Pattern exists in column 5 (being entered)
       * - Should NOT clear because column being entered has patterns
       *
       * Board layout:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . . . 1 1 . . .  ← pattern spans columns 5-6
       * 9   . . . . . 1 1 . . .  ← pattern spans columns 5-6
       *           ↑ ↑ ↑
       *           | | timeline entering column 5 (with pattern)
       *           | pattern detected at (5,8)
       *           timeline at column 4
       */

      const stateWithEnteringPatterns = {
        ...playingState,
        board: boardWithPattern,
        detectedPatterns: [{ x: 5, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 4, // Timeline at column 4, entering column 5 with pattern
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 2,
        },
        markedCells: [
          { x: 2, y: 8, color: 1 as const },
          { x: 2, y: 9, color: 1 as const },
        ],
      };

      const result = gameReducer(stateWithEnteringPatterns, {
        type: 'TICK',
      });

      // Should NOT clear because column 5 (being entered) has patterns
      // Should add 1 to holding score for the new pattern
      expect(result.timeline.holdingScore).toBe(3); // 2 + 1 new pattern
      expect(result.markedCells).toHaveLength(4); // 2 existing + 2 new cells
      expect(result.score).toBe(playingState.score); // No score added
      expect(result.timeline.x).toBe(5); // Timeline should move forward
    });

    it('should handle multiple patterns in the column being entered', () => {
      // Create state with two patterns in column 5 (the column timeline is entering)
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
       *           ↑ ↑
       *           | timeline entering column 5
       *           timeline at column 4
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
          x: 4, // Timeline at column 4, entering column 5
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(stateWithMultiplePatterns, {
        type: 'TICK',
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

      // Timeline should have moved to column 5
      expect(result.timeline.x).toBe(5);
    });

    it('should return unchanged state when no patterns and no holding score', () => {
      const stateWithNoPatterns = {
        ...playingState,
        detectedPatterns: [],
        timeline: {
          ...playingState.timeline,
          x: 4, // Timeline at column 4, entering column 5
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(stateWithNoPatterns, {
        type: 'TICK',
      });

      // Timeline should move but no clearing should happen
      expect(result.timeline.holdingScore).toBe(0);
      expect(result.markedCells).toHaveLength(0);
      expect(result.score).toBe(playingState.score);
      expect(result.board).toEqual(playingState.board);
      expect(result.timeline.x).toBe(5); // Timeline should move
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
         *              |  |   entering here (column 0)
         *              |  timeline at column 15 (last column)
         *              marked cell (will be cleared when entering column 0)
         */

        timeline: {
          ...playingState.timeline,
          x: 15, // Last column, about to wrap to 0
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 1,
        },
        markedCells: [{ x: 14, y: 8, color: 1 as const }],
      };

      const result = gameReducer(stateAtEdge, { type: 'TICK' });

      // Timeline should wrap to column 0
      expect(result.timeline.x).toBe(0);

      // Should clear since no patterns in column 0 (being entered) or column 15 (previous)
      expect(result.timeline.holdingScore).toBe(0);
      expect(result.score).toBe(playingState.score + 1);
    });

    it('should accumulate cells from patterns in column being entered when marking', () => {
      // Create state with pattern in column 5 (the column timeline is entering)
      const boardWithEnteringPattern = playingState.board.map(row => [...row]);
      boardWithEnteringPattern[8][5] = 1; // Pattern at (5,8)
      boardWithEnteringPattern[8][6] = 1;
      boardWithEnteringPattern[9][5] = 1;
      boardWithEnteringPattern[9][6] = 1;

      /*
       * Pattern in entering column scenario:
       *     0 1 2 3 4 5 6 7 8 9
       * 0   . . . . . . . . . .
       * 1   . . . . . . . . . .
       * ...
       * 7   . . . . . . . . . .
       * 8   . . . . . 1 1 . . .  ← pattern spans columns 5-6
       * 9   . . . . . 1 1 . . .  ← pattern spans columns 5-6
       *           ↑ ↑ ↑
       *           | | timeline entering column 5 (with pattern)
       *           | pattern at (5,8) in entering column
       *           timeline at column 4
       */

      const stateWithEnteringPattern = {
        ...playingState,
        board: boardWithEnteringPattern,
        detectedPatterns: [{ x: 5, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 4, // Timeline at column 4, entering column 5 with pattern
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(stateWithEnteringPattern, {
        type: 'TICK',
      });

      // Should mark cells and add score for the pattern in the entering column
      expect(result.timeline.x).toBe(5); // Timeline moved to column 5
      expect(result.timeline.holdingScore).toBe(1); // Score added for pattern
      expect(result.markedCells).toHaveLength(2); // 2 cells marked from pattern
      expect(result.score).toBe(playingState.score); // No score cleared yet
    });
  });

  describe('Timeline movement integration', () => {
    it('should process column when timeline timer reaches speed threshold', () => {
      const stateWithPattern = {
        ...playingState,
        board: playingState.board.map((row, y) =>
          row.map((cell, x) => {
            // Create a 2x2 pattern at (4,8) - the column timeline will enter
            if ((x === 4 || x === 5) && (y === 8 || y === 9)) {
              return 1 as const;
            }
            return cell;
          })
        ),
        detectedPatterns: [{ x: 4, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 3, // Timeline at column 3, will enter column 4
          timer: playingState.timeline.sweepInterval - 1, // One frame before moving
          // Use default speed (10 frames from config)
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(stateWithPattern, {
        type: 'TICK',
      });

      // Timeline should move and process the entering column
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
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(stateWithPattern, {
        type: 'TICK',
      });

      // Timeline should not move, just increment timer
      expect(result.timeline.x).toBe(3);
      expect(result.timeline.timer).toBe(6);
      expect(result.timeline.holdingScore).toBe(0);
    });
  });

  describe('Timeline edge cases', () => {
    it('should handle patterns at board edges correctly', () => {
      // Test pattern at column 0 (timeline entering from column 15)
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
       *     | timeline entering column 0 (from column 15)
       *     pattern at (0,8)
       */

      const stateWithEdgePattern = {
        ...playingState,
        board: boardWithEdgePattern,
        detectedPatterns: [{ x: 0, y: 8, color: 1 as const }],
        timeline: {
          ...playingState.timeline,
          x: 15, // Timeline at column 15, entering column 0
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(stateWithEdgePattern, {
        type: 'TICK',
      });

      // Should process normally even at edge
      expect(result.timeline.holdingScore).toBe(1);
      expect(result.markedCells).toHaveLength(2);
      expect(result.timeline.x).toBe(0); // Should wrap to column 0
    });

    it('should handle timeline at right edge (column 15)', () => {
      // Test timeline at right edge entering column 0
      const stateAtRightEdge = {
        ...playingState,
        detectedPatterns: [],
        timeline: {
          ...playingState.timeline,
          x: 15, // Last column, entering column 0
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(stateAtRightEdge, {
        type: 'TICK',
      });

      // Should wrap around to column 0
      expect(result.timeline.x).toBe(0);
      expect(result.timeline.timer).toBe(0);
    });

    it('should handle complex clearing scenarios with multiple marked columns', () => {
      // Create state with many marked columns and holding score
      const stateWithComplexMarking = {
        ...playingState,
        detectedPatterns: [], // No patterns in column 10 (being entered)

        /*
         * Complex clearing scenario:
         * - Timeline at column 9, entering column 10 (no patterns)
         * - Multiple marked columns (2,3,4,5,6) from previous patterns
         * - No current patterns in column 10 being entered
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
         *         ↑ ↑ ↑ ↑ ↑     ↑
         *         marked cells  timeline entering column 10
         *         columns 2-6   (no patterns here)
         */

        timeline: {
          ...playingState.timeline,
          x: 9, // Timeline at column 9, entering column 10 (no patterns)
          timer: playingState.timeline.sweepInterval - 1,
          holdingScore: 5,
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
      });

      // Should clear all marked cells and apply score
      expect(result.timeline.holdingScore).toBe(0);
      expect(result.markedCells).toHaveLength(0);
      expect(result.score).toBe(playingState.score + 5);
      expect(result.timeline.x).toBe(10); // Timeline should move
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
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(slowTimelineState, {
        type: 'TICK',
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
          sweepInterval: 1, // Very fast timeline
          timer: 0, // Ready to move immediately
          holdingScore: 0,
        },
        markedCells: [],
      };

      const result = gameReducer(fastTimelineState, {
        type: 'TICK',
      });

      // Should move every frame
      expect(result.timeline.x).toBe(6);
      expect(result.timeline.timer).toBe(0);
    });
  });
});
