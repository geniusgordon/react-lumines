import { describe, it, expect, beforeEach } from 'vitest';

import type {
  GameState,
  GameAction,
  GameActionType,
  GameBoard,
} from '@/types/game';
import { createEmptyBoard } from '@/utils/gameLogic';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState(12345);
  });

  describe('Initial state creation', () => {
    it('should create valid initial state', () => {
      expect(initialState.status).toBe('start');
      expect(initialState.score).toBe(0);
      expect(initialState.rectanglesCleared).toBe(0);
      expect(initialState.frame).toBe(0);
      expect(initialState.seed).toBe(12345);
      expect(initialState.board).toEqual(createEmptyBoard());
      expect(initialState.blockPosition).toEqual({ x: 7, y: 0 });
      expect(initialState.timeline.active).toBe(true);
    });

    it('should generate different blocks for different seeds', () => {
      const state1 = createInitialGameState(12345);
      const state2 = createInitialGameState(54321);

      // Blocks should be different for different seeds
      expect(state1.currentBlock.pattern).not.toEqual(
        state2.currentBlock.pattern
      );
    });

    it('should generate same blocks for same seed', () => {
      const state1 = createInitialGameState(12345);
      const state2 = createInitialGameState(12345);

      expect(state1.currentBlock.pattern).toEqual(state2.currentBlock.pattern);
      expect(state1.queue[0].pattern).toEqual(state2.queue[0].pattern);
      expect(state1.queue[1].pattern).toEqual(state2.queue[1].pattern);
      expect(state1.queue[2].pattern).toEqual(state2.queue[2].pattern);
    });
  });

  describe('Game flow actions', () => {
    it('should start game', () => {
      const action: GameAction = { type: 'START_GAME', frame: 0 };
      const newState = gameReducer(initialState, action);

      expect(newState.status).toBe('playing');
      expect(newState.frame).toBe(0);
    });

    it('should pause game', () => {
      const playingState = { ...initialState, status: 'playing' as const };
      const action: GameAction = { type: 'PAUSE', frame: 100 };
      const newState = gameReducer(playingState, action);

      expect(newState.status).toBe('paused');
      expect(newState.frame).toBe(100);
    });

    it('should resume game', () => {
      const pausedState = { ...initialState, status: 'paused' as const };
      const action: GameAction = { type: 'RESUME', frame: 150 };
      const newState = gameReducer(pausedState, action);

      expect(newState.status).toBe('playing');
      expect(newState.frame).toBe(150);
    });

    it('should restart game', () => {
      const gameOverState = {
        ...initialState,
        status: 'gameOver' as const,
        score: 1000,
        rectanglesCleared: 5,
        frame: 500,
      };

      const action: GameAction = { type: 'RESTART', frame: 0 };
      const newState = gameReducer(gameOverState, action);

      expect(newState.status).toBe('start');
      expect(newState.score).toBe(0);
      expect(newState.rectanglesCleared).toBe(0);
      expect(newState.frame).toBe(0);
      expect(newState.board).toEqual(createEmptyBoard());
    });

    it('should end game', () => {
      const playingState = { ...initialState, status: 'playing' as const };
      const action: GameAction = { type: 'GAME_OVER', frame: 300 };
      const newState = gameReducer(playingState, action);

      expect(newState.status).toBe('gameOver');
      expect(newState.frame).toBe(300);
    });
  });

  describe('Block movement', () => {
    let playingState: GameState;

    beforeEach(() => {
      playingState = { ...initialState, status: 'playing' as const };
    });

    it('should move block left', () => {
      const action: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.x).toBe(6); // 7 - 1
      expect(newState.blockPosition.y).toBe(0);
      expect(newState.frame).toBe(10);
    });

    it('should move block right', () => {
      const action: GameAction = { type: 'MOVE_RIGHT', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.x).toBe(8); // 7 + 1
      expect(newState.blockPosition.y).toBe(0);
      expect(newState.frame).toBe(10);
    });

    it('should not move block out of bounds', () => {
      // Move to left edge
      const leftEdgeState = { ...playingState, blockPosition: { x: 0, y: 0 } };
      const leftAction: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const leftResult = gameReducer(leftEdgeState, leftAction);

      expect(leftResult.blockPosition.x).toBe(0); // Should not move

      // Move to right edge
      const rightEdgeState = {
        ...playingState,
        blockPosition: { x: 14, y: 0 },
      };
      const rightAction: GameAction = { type: 'MOVE_RIGHT', frame: 10 };
      const rightResult = gameReducer(rightEdgeState, rightAction);

      expect(rightResult.blockPosition.x).toBe(14); // Should not move
    });

    it('should rotate block clockwise', () => {
      const originalRotation = playingState.currentBlock.rotation;
      const action: GameAction = { type: 'ROTATE_CW', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.currentBlock.rotation).toBe((originalRotation + 1) % 4);
      expect(newState.frame).toBe(10);
    });

    it('should rotate block counter-clockwise', () => {
      const originalRotation = playingState.currentBlock.rotation;
      const action: GameAction = { type: 'ROTATE_CCW', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.currentBlock.rotation).toBe((originalRotation + 3) % 4);
      expect(newState.frame).toBe(10);
    });

    it('should soft drop block', () => {
      const action: GameAction = { type: 'SOFT_DROP', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.y).toBe(1); // 0 + 1
      expect(newState.frame).toBe(10);
    });

    it('should hard drop block to bottom', () => {
      const action: GameAction = { type: 'HARD_DROP', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.y).toBe(0);
      expect(newState.frame).toBe(10);
      // Should place block and generate new one
      expect(newState.currentBlock.id).not.toBe(playingState.currentBlock.id);
    });
  });

  describe('Game tick progression', () => {
    let playingState: GameState;

    beforeEach(() => {
      playingState = { ...initialState, status: 'playing' as const };
    });

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
          rectanglesCleared: 0,
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
          rectanglesCleared: 0,
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
          rectanglesCleared: 0,
        },
      };

      const action: GameAction = { type: 'TICK', frame: 100 };
      const newState = gameReducer(timelineState, action);

      expect(newState.timeline.active).toBe(true); // Timeline stays active for continuous sweep
      expect(newState.timeline.x).toBe(0); // Position resets to start new sweep
      expect(newState.timeline.timer).toBe(0); // Timer reset
    });
  });

  describe('Rectangle clearing', () => {
    let stateWithRectangles: GameState;

    beforeEach(() => {
      // Create a state with a board containing a rectangle
      const board = createEmptyBoard();
      board[8][5] = 1;
      board[8][6] = 1;
      board[9][5] = 1;
      board[9][6] = 1;

      stateWithRectangles = {
        ...initialState,
        status: 'playing' as const,
        board,
      };
    });

    it('should clear rectangles and update score', () => {
      const action: GameAction = { type: 'CLEAR_RECTANGLES', frame: 100 };
      const newState = gameReducer(stateWithRectangles, action);

      expect(newState.score).toBeGreaterThan(0);
      expect(newState.rectanglesCleared).toBeGreaterThan(0);
      expect(newState.timeline.active).toBe(true);
      expect(newState.frame).toBe(100);
    });

    it('should not clear if no rectangles present', () => {
      const emptyState = { ...initialState, status: 'playing' as const };
      const action: GameAction = { type: 'CLEAR_RECTANGLES', frame: 100 };
      const newState = gameReducer(emptyState, action);

      expect(newState.score).toBe(0);
      expect(newState.rectanglesCleared).toBe(0);
      expect(newState.timeline.active).toBe(true);
    });
  });

  describe('Gravity application', () => {
    let stateWithFloatingBlocks: GameState;

    beforeEach(() => {
      // Create a state with floating blocks
      const board = createEmptyBoard();
      board[3][5] = 1; // Floating block
      board[5][7] = 2; // Another floating block

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
  });

  describe('Error handling', () => {
    it('should ignore invalid actions', () => {
      const invalidAction = {
        type: 'INVALID_ACTION' as GameActionType,
        frame: 10,
      };
      const newState = gameReducer(initialState, invalidAction);

      expect(newState).toEqual(initialState);
    });

    it('should not process actions when game is over', () => {
      const gameOverState = { ...initialState, status: 'gameOver' as const };
      const action: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const newState = gameReducer(gameOverState, action);

      expect(newState).toEqual(gameOverState);
    });

    it('should not process movement actions when paused', () => {
      const pausedState = { ...initialState, status: 'paused' as const };
      const action: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const newState = gameReducer(pausedState, action);

      expect(newState).toEqual(pausedState);
    });
  });

  describe('State immutability', () => {
    it('should not mutate original state', () => {
      const originalState = { ...initialState };
      const action: GameAction = { type: 'START_GAME', frame: 0 };

      gameReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should create new board instance', () => {
      const action: GameAction = { type: 'START_GAME', frame: 0 };
      const newState = gameReducer(initialState, action);

      expect(newState.board).not.toBe(initialState.board);
    });

    it('should create new block instances', () => {
      const action: GameAction = { type: 'ROTATE_CW', frame: 10 };
      const playingState = { ...initialState, status: 'playing' as const };
      const newState = gameReducer(playingState, action);

      expect(newState.currentBlock).not.toBe(playingState.currentBlock);
    });
  });

  describe('Game action controls', () => {
    let playingState: GameState;

    beforeEach(() => {
      playingState = { ...initialState, status: 'playing' as const };
    });

    it('should apply gravity when APPLY_GRAVITY action is dispatched', () => {
      // Create a state with some floating blocks (simulating after rectangles were cleared)
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
