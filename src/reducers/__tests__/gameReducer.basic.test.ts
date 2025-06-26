import { describe, it, expect, beforeEach } from 'vitest';

import { TIMER_CONFIG } from '@/constants';
import type { GameState, GameAction, GameActionType } from '@/types/game';
import { createEmptyBoard } from '@/utils/gameLogic';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer - Basic Functionality', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState('12345');
  });

  describe('Initial state creation', () => {
    it('should create valid initial state', () => {
      expect(initialState.status).toBe('initial');
      expect(initialState.score).toBe(0);
      expect(initialState.frame).toBe(0);
      expect(initialState.seed).toBe('12345');
      expect(initialState.board).toEqual(createEmptyBoard());
      expect(initialState.blockPosition).toEqual({ x: 7, y: -2 });
      expect(initialState.timeline.active).toBe(true);
    });

    it('should generate different blocks for different seeds', () => {
      const state1 = createInitialGameState('12345');
      const state2 = createInitialGameState('54321');

      // Blocks should be different for different seeds
      expect(state1.currentBlock.pattern).not.toEqual(
        state2.currentBlock.pattern
      );
    });

    it('should generate same blocks for same seed', () => {
      const state1 = createInitialGameState('12345');
      const state2 = createInitialGameState('12345');

      expect(state1.currentBlock.pattern).toEqual(state2.currentBlock.pattern);
      expect(state1.queue[0].pattern).toEqual(state2.queue[0].pattern);
      expect(state1.queue[1].pattern).toEqual(state2.queue[1].pattern);
      expect(state1.queue[2].pattern).toEqual(state2.queue[2].pattern);
    });
  });

  describe('Game flow actions', () => {
    it('should start game', () => {
      const action: GameAction = { type: 'START_GAME' };
      const newState = gameReducer(initialState, action);

      expect(newState.status).toBe('countdown');
      expect(newState.frame).toBe(0);
      expect(newState.countdown).toBe(3);
      expect(newState.gameTimer).toBe(3600); // 60 seconds * 60 FPS
    });

    it('should pause game', () => {
      const playingState = { ...initialState, status: 'playing' as const };
      const action: GameAction = { type: 'PAUSE' };
      const newState = gameReducer(playingState, action);

      expect(newState.status).toBe('paused');
    });

    it('should resume game', () => {
      const pausedState = { ...initialState, status: 'paused' as const };
      const action: GameAction = { type: 'RESUME' };
      const newState = gameReducer(pausedState, action);

      expect(newState.status).toBe('playing');
    });

    it('should restart game', () => {
      const gameOverState = {
        ...initialState,
        status: 'gameOver' as const,
        score: 1000,
        frame: 500,
      };

      const action: GameAction = { type: 'RESTART' };
      const newState = gameReducer(gameOverState, action);

      expect(newState.status).toBe('initial');
      expect(newState.score).toBe(0);
      expect(newState.frame).toBe(0);
      expect(newState.board).toEqual(createEmptyBoard());
    });

    it('should toggle debug mode', () => {
      const action: GameAction = {
        type: 'SET_DEBUG_MODE',
        payload: true,
      };
      const newState = gameReducer(initialState, action);

      expect(newState.debugMode).toBe(true);

      // Test toggle off
      const offAction: GameAction = {
        type: 'SET_DEBUG_MODE',
        payload: false,
      };
      const offState = gameReducer(newState, offAction);

      expect(offState.debugMode).toBe(false);
    });
  });

  describe('Countdown functionality', () => {
    it('should start with countdown of 3', () => {
      const action: GameAction = { type: 'START_GAME' };
      const newState = gameReducer(initialState, action);

      expect(newState.status).toBe('countdown');
      expect(newState.countdown).toBe(3);
    });

    it('should countdown from 3 to 2 to 1', () => {
      const startAction: GameAction = { type: 'START_GAME' };
      let state = gameReducer(initialState, startAction);

      // First countdown (3 -> 2)
      for (let i = 1; i <= TIMER_CONFIG.COUNTDOWN_DURATION; i++) {
        const tick1: GameAction = {
          type: 'TICK',
        };
        state = gameReducer(state, tick1);
      }
      expect(state.countdown).toBe(TIMER_CONFIG.COUNTDOWN_START - 1);
      expect(state.status).toBe('countdown');

      // Second countdown (2 -> 1)
      for (let i = 1; i <= TIMER_CONFIG.COUNTDOWN_DURATION; i++) {
        const tick2: GameAction = {
          type: 'TICK',
        };
        state = gameReducer(state, tick2);
      }
      expect(state.countdown).toBe(TIMER_CONFIG.COUNTDOWN_START - 2);
      expect(state.status).toBe('countdown');

      // Final countdown (1 -> 0, start playing)
      for (let i = 1; i <= TIMER_CONFIG.COUNTDOWN_DURATION; i++) {
        const tick3: GameAction = {
          type: 'TICK',
        };
        state = gameReducer(state, tick3);
      }
      expect(state.countdown).toBe(TIMER_CONFIG.COUNTDOWN_START - 3);
      expect(state.status).toBe('playing');
    });

    it('should handle game timer countdown', () => {
      // Start game and get to playing state
      const startAction: GameAction = { type: 'START_GAME' };
      let state = gameReducer(initialState, startAction);

      // Fast forward through countdown
      for (let i = 1; i <= TIMER_CONFIG.COUNTDOWN_DURATION * 3; i++) {
        const tick: GameAction = { type: 'TICK' };
        state = gameReducer(state, tick);
      }

      expect(state.status).toBe('playing');
      const initialGameTimer = state.gameTimer;

      // Game timer should count down during play
      const playTick: GameAction = { type: 'TICK' };
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

      const tick: GameAction = { type: 'TICK' };
      const finalState = gameReducer(almostExpiredState, tick);

      expect(finalState.status).toBe('gameOver');
      expect(finalState.gameTimer).toBe(0);
    });

    it('should pause countdown and resume correctly', () => {
      // Start game with countdown
      const startAction: GameAction = { type: 'START_GAME' };
      let state = gameReducer(initialState, startAction);
      expect(state.status).toBe('countdown');

      // Advance to frame 30 (halfway through first countdown)
      for (let i = 1; i <= TIMER_CONFIG.COUNTDOWN_DURATION; i++) {
        const tick1: GameAction = {
          type: 'TICK',
        };
        state = gameReducer(state, tick1);
      }
      expect(state.countdown).toBe(2);

      // Pause during countdown
      const pauseAction: GameAction = {
        type: 'PAUSE',
      };
      state = gameReducer(state, pauseAction);
      expect(state.status).toBe('countdownPaused');

      // Resume - since useGameLoop stops during pause, frame doesn't advance
      const resumeAction: GameAction = {
        type: 'RESUME',
      };
      state = gameReducer(state, resumeAction);
      expect(state.status).toBe('countdown');

      // Continue ticking from where we left off
      for (let i = 1; i <= TIMER_CONFIG.COUNTDOWN_DURATION; i++) {
        const tick2: GameAction = {
          type: 'TICK',
        };
        state = gameReducer(state, tick2);
      }
      expect(state.countdown).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should ignore invalid actions', () => {
      const invalidAction = {
        type: 'INVALID_ACTION' as GameActionType,
      };
      const newState = gameReducer(initialState, invalidAction);

      expect(newState).toEqual(initialState);
    });

    it('should not process actions when game is over', () => {
      const gameOverState = { ...initialState, status: 'gameOver' as const };
      const action: GameAction = { type: 'MOVE_LEFT' };
      const newState = gameReducer(gameOverState, action);

      expect(newState).toEqual(gameOverState);
    });

    it('should not process movement actions when paused', () => {
      const pausedState = { ...initialState, status: 'paused' as const };
      const action: GameAction = { type: 'MOVE_LEFT' };
      const newState = gameReducer(pausedState, action);

      expect(newState).toEqual(pausedState);
    });
  });

  describe('State immutability', () => {
    it('should not mutate original state', () => {
      const originalState = { ...initialState };
      const action: GameAction = { type: 'START_GAME' };

      gameReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should create new board instance', () => {
      const action: GameAction = { type: 'START_GAME' };
      const newState = gameReducer(initialState, action);

      expect(newState.board).toBe(initialState.board);
      expect(newState.status).toBe('countdown');
    });

    it('should create new block instances', () => {
      const action: GameAction = { type: 'ROTATE_CW' };
      const playingState = { ...initialState, status: 'playing' as const };
      const newState = gameReducer(playingState, action);

      expect(newState.currentBlock).not.toBe(playingState.currentBlock);
    });
  });
});
