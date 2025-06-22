import { describe, it, expect, beforeEach } from 'vitest';

import type { GameState, GameAction, GameActionType } from '@/types/game';
import { createEmptyBoard } from '@/utils/gameLogic';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer - Basic Functionality', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState(12345);
  });

  describe('Initial state creation', () => {
    it('should create valid initial state', () => {
      expect(initialState.status).toBe('start');
      expect(initialState.score).toBe(0);
      expect(initialState.frame).toBe(0);
      expect(initialState.seed).toBe(12345);
      expect(initialState.board).toEqual(createEmptyBoard());
      expect(initialState.blockPosition).toEqual({ x: 7, y: -2 });
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

      expect(newState.status).toBe('countdown');
      expect(newState.frame).toBe(0);
      expect(newState.countdown).toBe(3);
      expect(newState.gameTimer).toBe(3600); // 60 seconds * 60 FPS
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
        frame: 500,
      };

      const action: GameAction = { type: 'RESTART', frame: 0 };
      const newState = gameReducer(gameOverState, action);

      expect(newState.status).toBe('start');
      expect(newState.score).toBe(0);
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

    it('should toggle debug mode', () => {
      const action: GameAction = {
        type: 'SET_DEBUG_MODE',
        frame: 50,
        payload: true,
      };
      const newState = gameReducer(initialState, action);

      expect(newState.debugMode).toBe(true);
      expect(newState.frame).toBe(50);

      // Test toggle off
      const offAction: GameAction = {
        type: 'SET_DEBUG_MODE',
        frame: 60,
        payload: false,
      };
      const offState = gameReducer(newState, offAction);

      expect(offState.debugMode).toBe(false);
      expect(offState.frame).toBe(60);
    });
  });

  describe('Countdown functionality', () => {
    it('should start with countdown of 3', () => {
      const action: GameAction = { type: 'START_GAME', frame: 0 };
      const newState = gameReducer(initialState, action);

      expect(newState.status).toBe('countdown');
      expect(newState.countdown).toBe(3);
    });

    it('should countdown from 3 to 2 to 1', () => {
      const startAction: GameAction = { type: 'START_GAME', frame: 0 };
      let state = gameReducer(initialState, startAction);

      // First countdown (3 -> 2)
      const tick1: GameAction = { type: 'TICK', frame: 60 };
      state = gameReducer(state, tick1);
      expect(state.countdown).toBe(2);
      expect(state.status).toBe('countdown');

      // Second countdown (2 -> 1)
      const tick2: GameAction = { type: 'TICK', frame: 120 };
      state = gameReducer(state, tick2);
      expect(state.countdown).toBe(1);
      expect(state.status).toBe('countdown');

      // Final countdown (1 -> 0, start playing)
      const tick3: GameAction = { type: 'TICK', frame: 180 };
      state = gameReducer(state, tick3);
      expect(state.countdown).toBe(0);
      expect(state.status).toBe('playing');
    });

    it('should handle game timer countdown', () => {
      // Start game and get to playing state
      const startAction: GameAction = { type: 'START_GAME', frame: 0 };
      let state = gameReducer(initialState, startAction);

      // Fast forward through countdown
      for (let i = 1; i <= 3; i++) {
        const tick: GameAction = { type: 'TICK', frame: i * 60 };
        state = gameReducer(state, tick);
      }

      expect(state.status).toBe('playing');
      const initialGameTimer = state.gameTimer;

      // Game timer should count down during play
      const playTick: GameAction = { type: 'TICK', frame: 181 };
      state = gameReducer(state, playTick);
      expect(state.gameTimer).toBe(initialGameTimer - 1);
    });

    it('should end game when timer reaches zero', () => {
      // Create state with almost no time left
      const almostExpiredState = {
        ...initialState,
        status: 'playing' as const,
        gameTimer: 1,
      };

      const tick: GameAction = { type: 'TICK', frame: 3600 };
      const finalState = gameReducer(almostExpiredState, tick);

      expect(finalState.status).toBe('gameOver');
      expect(finalState.gameTimer).toBe(0);
    });

    it('should pause countdown and resume correctly', () => {
      // Start game with countdown
      const startAction: GameAction = { type: 'START_GAME', frame: 0 };
      let state = gameReducer(initialState, startAction);
      expect(state.status).toBe('countdown');

      // Advance to frame 30 (halfway through first countdown)
      const tick1: GameAction = { type: 'TICK', frame: 30 };
      state = gameReducer(state, tick1);
      expect(state.countdown).toBe(3); // Still on 3

      // Pause during countdown
      const pauseAction: GameAction = { type: 'PAUSE', frame: 30 };
      state = gameReducer(state, pauseAction);
      expect(state.status).toBe('countdownPaused');

      // Resume - since useGameLoop stops during pause, frame doesn't advance
      const resumeAction: GameAction = { type: 'RESUME', frame: 30 };
      state = gameReducer(state, resumeAction);
      expect(state.status).toBe('countdown');

      // Continue ticking from where we left off (frame 30 -> 60)
      const tick2: GameAction = { type: 'TICK', frame: 60 };
      state = gameReducer(state, tick2);
      expect(state.countdown).toBe(2); // Should decrement to 2
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
});
